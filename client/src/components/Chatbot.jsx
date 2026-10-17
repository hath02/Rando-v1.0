import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';

const START_MESSAGE =
    "Hi! I'm Rando's store assistant. I can help you find furniture and home decor, browse sale items, or navigate your account. What can I help you with?";

const QUICK_ACTIONS = [
    'Find a product',
    'View sales',
    'My orders',
    'Shipping & returns',
];

const SEARCH_SYNONYMS = {
    chair: ['armchair', 'stool', 'seat'],
    armchair: ['chair'],
    seat: ['chair', 'stool'],
    couch: ['sofa'],
    sofa: ['couch'],
    lamp: ['light', 'lighting', 'pendant', 'chandelier'],
    lamps: ['light', 'lighting', 'pendant', 'chandelier'],
    light: ['lamp', 'lighting', 'pendant', 'chandelier'],
    lighting: ['lamp', 'light', 'pendant', 'chandelier'],
    decor: ['decoration', 'terrarium', 'mirror', 'clock'],
};

const STOP_WORDS = new Set([
    'a', 'about', 'an', 'and', 'are', 'around', 'at', 'available', 'below',
    'buy', 'can', 'could', 'do', 'for', 'find', 'get', 'good', 'have', 'help',
    'hey', 'hi', 'i', 'im', 'in', 'is', 'it', 'just', 'looking', 'me', 'my',
    'need', 'of', 'on', 'or', 'please', 'product', 'products', 'recommend',
    'search', 'show', 'something', 'some', 'tell', 'than', 'the', 'there',
    'to', 'under', 'want', 'what', 'with', 'would', 'you', 'your', 'item',
    'items', 'cheap', 'price', 'budget', 'less', 'more', 'like', 'a', 'any',
]);

function normalize(value) {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function productImageUrl(image) {
    if (!image) return '/uploads/placeholder.png';
    if (/^https?:\/\//i.test(image) || image.startsWith('/')) return image;

    const filename = String(image)
        .replace(/^public\/uploads\//i, '')
        .replace(/^uploads\//i, '');
    return `/uploads/${filename}`;
}

function isSaleProduct(product) {
    return Number(product.on_sale) === 1 && Number(product.sale_price) > 0;
}

function searchCatalog(query, products) {
    const term = normalize(query);
    const saleIntent = /\b(sale|sales|discount|discounted|promotion|promotions|deal|deals|offer|offers)\b/.test(term);

    const tokens = term
        .split(' ')
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
    const meaningfulTokens = tokens.filter((token) =>
        !['sale', 'sales', 'discount', 'discounted', 'promotion', 'promotions', 'deal', 'deals', 'offer', 'offers'].includes(token)
    );

    let candidates = Array.isArray(products) ? products : [];
    if (saleIntent) candidates = candidates.filter(isSaleProduct);

    const expandedTokens = new Set(meaningfulTokens);
    for (const token of meaningfulTokens) {
        for (const synonym of SEARCH_SYNONYMS[token] ?? []) expandedTokens.add(synonym);
        if (token.length > 3 && token.endsWith('s')) expandedTokens.add(token.slice(0, -1));
    }

    const scored = candidates.map((product) => {
        const name = normalize(product.name);
        const category = normalize(product.category_name);
        const description = normalize(product.description);
        let score = 0;

        for (const token of expandedTokens) {
            if (name.includes(token)) score += 4;
            if (category.includes(token)) score += 3;
            if (description.includes(token)) score += 1;
        }

        return { product, score };
    });

    return scored
        .filter((item) => meaningfulTokens.length === 0 ? saleIntent : item.score > 0)
        .sort((a, b) => b.score - a.score || Number(b.product.stock || 0) - Number(a.product.stock || 0))
        .slice(0, 3)
        .map((item) => item.product);
}

function routeAction(label, to) {
    return { label, to };
}

function getSimpleReply(rawText) {
    const text = normalize(rawText);

    if (/^(hi|hello|hey|good morning|good afternoon|good evening)( rando)?$/.test(text)) {
        return {
            text: "Hello! Tell me what you're shopping for, or choose one of the options below.",
            actions: [routeAction('Shop all products', '/shop'), routeAction('View sales', '/sales')],
        };
    }

    if (/\b(thanks|thank you|thx)\b/.test(text)) {
        return { text: "You're welcome! I'm here whenever you need help finding something.", actions: [routeAction('Continue shopping', '/shop')] };
    }

    if (/\b(bye|goodbye)\b/.test(text)) {
        return { text: 'Thanks for visiting Rando. Have a lovely day!', actions: [routeAction('Return to home', '/')] };
    }

    if (/\b(help|what can you do|how can you help)\b/.test(text)) {
        return {
            text: 'I can search the current product catalog, show sale items, explain the cash-on-delivery option shown at checkout, and help you get to your account or orders. The site does not currently publish enough detail for me to confirm delivery fees, delivery times, or return and refund rules.',
            actions: [routeAction('Shop all products', '/shop'), routeAction('My account', '/account')],
        };
    }

    if (/\b(my orders|order status|track my order|track order|tracking|where is my order|orders)\b/.test(text)) {
        return {
            text: 'You can review your orders and their current status in My Account → Orders. You may need to sign in first.',
            actions: [routeAction('View my orders', '/account/orders'), routeAction('Sign in', '/account')],
        };
    }

    if (/\b(sign in|sign-in|log in|login|my account|profile|account settings|password)\b/.test(text)) {
        return {
            text: 'Open My Account to sign in or manage your customer account.',
            actions: [routeAction('Open my account', '/account')],
        };
    }

    if (/\b(cart|shopping bag|basket)\b/.test(text)) {
        return {
            text: 'You can review the items you have added from your cart page.',
            actions: [routeAction('Open cart', '/cart')],
        };
    }

    if (/\b(payment|pay|payment method|cash on delivery|cod|card|credit card|debit card|bank transfer|do you accept)\b/.test(text)) {
        return {
            text: 'The checkout flow currently uses cash on delivery (COD), which is the payment method shown on the site. You pay when your order arrives. After an order is placed, the confirmation page says the store team will call the phone number on the order to confirm delivery.',
            actions: [routeAction('Continue to checkout', '/checkout'), routeAction('View my orders', '/account/orders')],
        };
    }

    if (/\b(shipping|delivery|deliver|delivery fee|delivery time|shipping cost|shipping fee|free shipping)\b/.test(text)) {
        return {
            text: "The cart currently displays shipping as ‘Calculated at checkout’, but Rando's site does not specify a delivery fee, delivery timeframe, or delivery coverage area. After you place an order, the confirmation page says the team will call your phone number to confirm delivery.",
            actions: [routeAction('Open cart', '/cart'), routeAction('Continue to checkout', '/checkout')],
        };
    }

    if (/\b(return|returns|refund|refunds|exchange|exchanges|warranty|guarantee)\b/.test(text)) {
        return {
            text: "I couldn't find a published return, refund, exchange, or warranty policy in the current Rando site code, so I don't want to guess. Please confirm those terms with the store team before ordering.",
            actions: [routeAction('Open My Account', '/account'), routeAction('Shop all products', '/shop')],
        };
    }

    if (/^(view|browse|open)? ?(the )?(current )?(sale|sales|sale collection|sales collection|discounts|promotions)$/.test(text)) {
        return {
            text: 'You can browse the current sale collection here. I can also search the catalog for a type of item that is on sale.',
            actions: [routeAction('Browse sales', '/sales'), routeAction('Shop all products', '/shop')],
        };
    }

    if (/^(find|search|show|recommend|browse)( me)?( a)?( product| products| item| items| something)?$/.test(text) || /^(find a product|product finder|recommend something)$/.test(text)) {
        return {
            text: 'What are you looking for? Type an item or category, for example “chair”, “table”, “wall clock”, or “lighting”.',
            actions: [routeAction('Browse all products', '/shop')],
        };
    }

    if (/\b(shop|browse products|all products|catalog|catalogue)\b/.test(text)) {
        return {
            text: 'Open the shop to browse the full product catalog. You can also tell me a product name or category and I will search for matching items.',
            actions: [routeAction('Open shop', '/shop')],
        };
    }

    return null;
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { id: 1, role: 'bot', text: START_MESSAGE, actions: [] },
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [catalogError, setCatalogError] = useState(false);

    const nextId = useRef(2);
    const messagesEndRef = useRef(null);
    const productCacheRef = useRef(null);
    const productRequestRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [isOpen, messages, isTyping]);

    async function loadProducts() {
        if (productCacheRef.current !== null) return productCacheRef.current;
        if (productRequestRef.current) return productRequestRef.current;

        productRequestRef.current = apiFetch('/api/home')
            .then((data) => {
                const products = Array.isArray(data.products) ? data.products : [];
                productCacheRef.current = products;
                setCatalogError(false);
                return products;
            })
            .catch(() => {
                setCatalogError(true);
                return null;
            })
            .finally(() => {
                productRequestRef.current = null;
            });

        return productRequestRef.current;
    }

    async function makeReply(text) {
        const simpleReply = getSimpleReply(text);
        if (simpleReply) return simpleReply;

        const normalized = normalize(text);
        const productIntent = /\b(chair|stool|table|desk|lamp|light|lighting|clock|mirror|terrarium|chandelier|pendant|shelf|shelves|sofa|seat|furniture|decor|decoration|product|products|item|items|sale|discount|recommend|looking for|find|search|show me)\b/.test(normalized);
        const genericSearch = !/\b(thanks|thank you|bye|goodbye)\b/.test(normalized);

        if (productIntent || genericSearch) {
            const products = await loadProducts();

            if (!products) {
                return {
                    text: 'I could not connect to the product catalog right now. Please check that the shop server is running, or open the shop directly.',
                    actions: [routeAction('Open shop', '/shop')],
                };
            }

            const results = searchCatalog(text, products);
            if (results.length > 0) {
                const saleQuery = /\b(sale|sales|discount|discounted|promotion|promotions|deal|deals|offer|offers)\b/.test(normalized);
                return {
                    text: `${saleQuery ? 'Here are some sale items' : 'Here are a few products that may match'} your search:`,
                    actions: [routeAction('See all products', '/shop'), ...(saleQuery ? [routeAction('See all sales', '/sales')] : [])],
                    products: results,
                };
            }

            if (products.length === 0) {
                return {
                    text: 'The catalog did not return any active products. You can still open the shop, or check back after the catalog is available.',
                    actions: [routeAction('Open shop', '/shop')],
                };
            }

            return {
                text: `I couldn't find an exact match for “${text}”. Try a product name or category such as “chair”, “table”, “wall clock”, or “lighting”.`,
                actions: [routeAction('Browse all products', '/shop'), routeAction('Browse sales', '/sales')],
            };
        }

        return {
            text: "I'm a simple store assistant, so I may not understand every question yet. Try asking me to find a product, show sale items, open your orders, or tell you about shipping and returns.",
            actions: [routeAction('Shop all products', '/shop'), routeAction('My orders', '/account/orders')],
        };
    }

    async function sendMessage(value = input) {
        const text = String(value ?? '').trim();
        if (!text || isTyping) return;

        setInput('');
        setMessages((current) => [...current, { id: nextId.current++, role: 'user', text }]);
        setIsTyping(true);

        try {
            const reply = await makeReply(text);
            setMessages((current) => [...current, { id: nextId.current++, role: 'bot', ...reply }]);
        } catch {
            setMessages((current) => [...current, {
                id: nextId.current++,
                role: 'bot',
                text: 'Something went wrong while I was preparing that answer. Please try again.',
                actions: [routeAction('Open shop', '/shop')],
            }]);
        } finally {
            setIsTyping(false);
        }
    }

    return (
        <div className="rando-chatbot">
            {isOpen && (
                <section className="rando-chat-panel" aria-label="Rando store assistant">
                    <header className="rando-chat-header">
                        <div className="rando-chat-brand-icon" aria-hidden="true">R</div>
                        <div className="rando-chat-heading">
                            <strong>Rando Assistant</strong>
                            <span><i aria-hidden="true" /> Store help</span>
                        </div>
                        <button
                            className="rando-chat-close"
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chat"
                        >
                            ×
                        </button>
                    </header>

                    <div className="rando-chat-messages" aria-live="polite" aria-relevant="additions text">
                        {messages.map((message) => (
                            <div className={`rando-chat-row rando-chat-row-${message.role}`} key={message.id}>
                                {message.role === 'bot' && <span className="rando-chat-avatar" aria-hidden="true">R</span>}
                                <div className={`rando-chat-bubble rando-chat-bubble-${message.role}`}>
                                    <p>{message.text}</p>

                                    {message.products?.length > 0 && (
                                        <div className="rando-chat-products">
                                            {message.products.map((product) => {
                                                const onSale = isSaleProduct(product);
                                                return (
                                                    <Link
                                                        className="rando-chat-product"
                                                        to={`/product/${product.id}`}
                                                        key={product.id}
                                                        onClick={() => setIsOpen(false)}
                                                    >
                                                        <img
                                                            src={productImageUrl(product.image)}
                                                            alt=""
                                                            onError={(event) => {
                                                                event.currentTarget.onerror = null;
                                                                event.currentTarget.src = '/uploads/placeholder.png';
                                                            }}
                                                        />
                                                        <span className="rando-chat-product-info">
                                                            <strong>{product.name}</strong>
                                                            <small>{product.category_name || 'Home & decor'}</small>
                                                            <span className="rando-chat-product-price">
                                                                {onSale && <del>{formatPrice(product.price)}</del>}
                                                                <b>{formatPrice(onSale ? product.sale_price : product.price)}</b>
                                                            </span>
                                                            {Number(product.stock) <= 0 && <small className="rando-chat-stock">Currently out of stock</small>}
                                                        </span>
                                                        <span className="rando-chat-product-arrow" aria-hidden="true">↗</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {message.actions?.length > 0 && (
                                        <div className="rando-chat-actions">
                                            {message.actions.map((action) => (
                                                <Link
                                                    to={action.to}
                                                    key={`${action.to}-${action.label}`}
                                                    onClick={() => setIsOpen(false)}
                                                >
                                                    {action.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {messages.length === 1 && (
                            <div className="rando-chat-quick-actions">
                                {QUICK_ACTIONS.map((action) => (
                                    <button type="button" key={action} onClick={() => sendMessage(action)} disabled={isTyping}>
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isTyping && <div className="rando-chat-typing">Checking that for you…</div>}
                        {catalogError && <span className="rando-chat-note">Catalog connection failed. Product search may be unavailable.</span>}
                        <div ref={messagesEndRef} />
                    </div>

                    <form
                        className="rando-chat-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendMessage();
                        }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask about a product…"
                            aria-label="Message Rando Assistant"
                            maxLength={180}
                        />
                        <button type="submit" disabled={!input.trim() || isTyping} aria-label="Send message">
                            <span aria-hidden="true">➤</span>
                        </button>
                    </form>
                    <p className="rando-chat-disclaimer">Automated help · Store policies need confirmation</p>
                </section>
            )}

            <button
                className={`rando-chat-launcher ${isOpen ? 'rando-chat-launcher-open' : ''}`}
                type="button"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Close Rando Assistant' : 'Open Rando Assistant'}
                onClick={() => setIsOpen((open) => !open)}
            >
                {isOpen ? <span aria-hidden="true">×</span> : <><span className="rando-chat-launcher-icon" aria-hidden="true">✦</span><span>Chat with us</span></>}
            </button>
        </div>
    );
}
