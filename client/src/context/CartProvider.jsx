import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from './auth-context.js';
import { CartContext } from './cart-context.js';

const EMPTY_CART = { items: [], totalItems: 0, subtotal: 0 };

function normalizeCart(data = {}) {
    return {
        items: data.items ?? [],
        totalItems: Number(data.totalItems) || 0,
        subtotal: Number(data.subtotal) || 0,
    };
}

// Keeps the signed-in customer's cart in sync with the server.
// Must be rendered inside <AuthProvider>.
export default function CartProvider({ children }) {
    const { user } = useAuth();
    const userId = user?.id ?? null;

    // Tie cart state to the account that loaded it, so one customer's cart is
    // never briefly displayed after logout or while another customer signs in.
    const [cartState, setCartState] = useState({
        userId: null,
        data: EMPTY_CART,
        loading: false,
    });

    const hasCurrentCart = userId !== null && cartState.userId === userId;
    const cart = hasCurrentCart ? cartState.data : EMPTY_CART;
    const loading = userId !== null && (!hasCurrentCart || cartState.loading);

    useEffect(() => {
        if (userId === null) return undefined;

        const controller = new AbortController();

        apiFetch('/api/cart', { signal: controller.signal })
            .then((data) => {
                setCartState({ userId, data: normalizeCart(data), loading: false });
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Cart load failed:', error.message);
                    setCartState({ userId, data: EMPTY_CART, loading: false });
                }
            });

        return () => controller.abort();
    }, [userId]);

    // Every cart endpoint returns the full, updated cart.
    const applyCart = useCallback((data) => {
        setCartState({ userId, data: normalizeCart(data), loading: false });
    }, [userId]);

    // Resolves with a message to show the customer.
    const addToCart = useCallback(async (productId, quantity = 1) => {
        const data = await apiFetch('/api/cart/items', {
            method: 'POST',
            body: { productId, quantity },
        });

        applyCart(data);
        return data.message;
    }, [applyCart]);

    const updateQuantity = useCallback(async (cartItemId, quantity) => {
        applyCart(
            await apiFetch(`/api/cart/items/${cartItemId}`, {
                method: 'PATCH',
                body: { quantity },
            })
        );
    }, [applyCart]);

    const removeItem = useCallback(async (cartItemId) => {
        applyCart(
            await apiFetch(`/api/cart/items/${cartItemId}`, {
                method: 'DELETE',
            })
        );
    }, [applyCart]);

    // Re-read the cart from the server (for example after placing an order).
    const reloadCart = useCallback(async () => {
        applyCart(await apiFetch('/api/cart'));
    }, [applyCart]);

    const clearCart = useCallback(async () => {
        applyCart(await apiFetch('/api/cart', { method: 'DELETE' }));
    }, [applyCart]);

    const value = useMemo(
        () => ({
            items: cart.items,
            totalItems: cart.totalItems,
            subtotal: cart.subtotal,
            loading,
            addToCart,
            updateQuantity,
            removeItem,
            clearCart,
            reloadCart,
        }),
        [cart, loading, addToCart, updateQuantity, removeItem, clearCart, reloadCart]
    );

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
