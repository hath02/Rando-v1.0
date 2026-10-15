import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { ALLOWED_IMAGE_TYPES, checkImageFile, getImageUrl } from '../lib/images.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const emptyForm = {
    name: '', description: '', category_id: '', price: '', sale_price: '',
    on_sale: false, stock: '0', status: 'active',
};
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [reloadKey, setReloadKey] = useState(0);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    // Image upload state: the file chosen now, the image the product already has,
    // and whether the existing image should be removed.
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [currentImage, setCurrentImage] = useState('');
    const [removeImage, setRemoveImage] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        apiFetch('/api/admin/categories', { signal: controller.signal })
            .then((result) => setCategories(result.categories || []))
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message); });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ q: search, status: statusFilter });
        apiFetch(`/api/admin/products?${params.toString()}`, { signal: controller.signal })
            .then((result) => setProducts(result.products || []))
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Could not load products.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [search, statusFilter, reloadKey]);

    // Show a local preview of the chosen file, and release it when it changes.
    useEffect(() => {
        if (!imageFile) {
            setImagePreview('');
            return undefined;
        }

        const url = URL.createObjectURL(imageFile);
        setImagePreview(url);

        return () => URL.revokeObjectURL(url);
    }, [imageFile]);

    function resetImageState(existingImage = '') {
        setImageFile(null);
        setRemoveImage(false);
        setCurrentImage(existingImage);
        setFileInputKey((current) => current + 1); // clears the file input
    }

    function startCreate() {
        setEditingId(null);
        setForm(emptyForm);
        resetImageState();
        setError('');
        setNotice('');
    }

    function startEdit(product) {
        setEditingId(product.id);
        setForm({
            name: product.name || '', description: product.description || '',
            category_id: product.category_id == null ? '' : String(product.category_id),
            price: String(product.price ?? ''), sale_price: String(product.sale_price ?? ''),
            on_sale: Boolean(Number(product.on_sale)), stock: String(product.stock ?? 0),
            status: product.status || 'active',
        });
        resetImageState(product.image || '');
        setError('');
        setNotice('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateField(event) {
        const { name, value, checked, type } = event.target;
        setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    }

    function handleImageChange(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const problem = checkImageFile(file, MAX_IMAGE_BYTES);

        if (problem) {
            setError(problem);
            setFileInputKey((current) => current + 1);
            return;
        }

        setError('');
        setImageFile(file);
        setRemoveImage(false);
    }

    function discardNewImage() {
        setImageFile(null);
        setFileInputKey((current) => current + 1);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError('');
        setNotice('');

        // Sent as multipart form data so the image file travels with the fields.
        const body = new FormData();
        body.append('name', form.name);
        body.append('description', form.description);
        body.append('category_id', form.category_id);
        body.append('price', form.price);
        body.append('sale_price', form.on_sale ? form.sale_price : '0');
        body.append('on_sale', form.on_sale ? 'true' : 'false');
        body.append('stock', form.stock);
        body.append('status', form.status);
        if (imageFile) body.append('image', imageFile);
        else if (removeImage) body.append('remove_image', 'true');

        try {
            const path = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
            const result = await apiFetch(path, { method: editingId ? 'PUT' : 'POST', body });
            setNotice(result.message || 'Product saved.');
            setEditingId(null);
            setForm(emptyForm);
            resetImageState();
            setReloadKey((current) => current + 1);
        } catch (err) {
            setError(err.message || 'Could not save this product.');
        } finally {
            setSaving(false);
        }
    }

    async function changeStatus(product) {
        const nextStatus = product.status === 'active' ? 'inactive' : 'active';
        const action = nextStatus === 'inactive' ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} “${product.name}”?`)) return;
        setError('');
        setNotice('');
        try {
            const result = await apiFetch(`/api/admin/products/${product.id}/status`, {
                method: 'PATCH', body: { status: nextStatus },
            });
            setNotice(result.message || 'Product status updated.');
            setReloadKey((current) => current + 1);
        } catch (err) {
            setError(err.message || 'Could not update product status.');
        }
    }

    const shownCount = products.length;
    const shownImage = imagePreview || (!removeImage && currentImage ? getImageUrl(currentImage) : '');

    return (
        <div className="admin-page-content">
            <div className="admin-page-heading">
                <div><span className="admin-kicker">CATALOG</span><h1>Products</h1><p>Create, update, and control what appears in your storefront.</p></div>
                <button type="button" className="admin-primary-button" onClick={startCreate}>＋ New product</button>
            </div>

            {error && <p className="form-message form-error" role="alert">{error}</p>}
            {notice && <p className="form-message form-success" role="status">{notice}</p>}

            <section className="admin-panel admin-product-editor">
                <div className="admin-panel-heading">
                    <div><h2>{editingId ? `Edit product #${editingId}` : 'Product editor'}</h2><p>{editingId ? 'Changes are saved to your catalog.' : 'Add a product to your catalog.'}</p></div>
                    {(editingId || form.name || imageFile) && <button type="button" className="admin-text-button" onClick={startCreate}>Clear form</button>}
                </div>
                <form className="admin-form-grid" onSubmit={handleSubmit}>
                    <label className="admin-field admin-field-wide">Product name<input name="name" value={form.name} onChange={updateField} maxLength="255" required /></label>
                    <label className="admin-field">Category<select name="category_id" value={form.category_id} onChange={updateField}><option value="">Uncategorized</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
                    <label className="admin-field">Status<select name="status" value={form.status} onChange={updateField}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                    <label className="admin-field">Price (USD)<input name="price" type="number" min="0" step="1" value={form.price} onChange={updateField} required /></label>
                    <label className="admin-field">Stock quantity<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={updateField} required /></label>
                    <label className="admin-field admin-field-check"><input name="on_sale" type="checkbox" checked={form.on_sale} onChange={updateField} /> Put this product on sale</label>
                    <label className="admin-field">Sale price (USD)<input name="sale_price" type="number" min="1" step="1" value={form.sale_price} onChange={updateField} disabled={!form.on_sale} required={form.on_sale} /></label>

                    <div className="admin-image-field admin-field-wide">
                        <span className="admin-image-label">Product image</span>
                        <div className="admin-image-upload">
                            <div className="admin-image-preview">
                                {shownImage ? <img src={shownImage} alt="Product preview" /> : <span>No image</span>}
                            </div>
                            <div className="admin-image-controls">
                                <input
                                    key={fileInputKey}
                                    type="file"
                                    accept={ALLOWED_IMAGE_TYPES.join(',')}
                                    aria-label="Choose a product image"
                                    onChange={handleImageChange}
                                />
                                <small>JPG, PNG, WebP or GIF, up to 5 MB. The file is saved on the server.</small>
                                {imageFile && <button type="button" className="admin-text-button" onClick={discardNewImage}>Discard new image</button>}
                                {editingId && currentImage && !imageFile && (
                                    <label className="admin-checkbox">
                                        <input type="checkbox" checked={removeImage} onChange={(event) => setRemoveImage(event.target.checked)} />
                                        Remove current image
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <label className="admin-field admin-field-wide">Description<textarea name="description" value={form.description} onChange={updateField} rows="3" maxLength="5000" /></label>
                    <div className="admin-form-actions admin-field-wide">
                        <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}</button>
                        {editingId && <button type="button" className="admin-secondary-button" onClick={startCreate}>Cancel edit</button>}
                    </div>
                </form>
            </section>

            <section className="admin-panel">
                <div className="admin-panel-heading admin-list-heading">
                    <div><h2>Catalog inventory</h2><p>{shownCount} product{shownCount === 1 ? '' : 's'} matching the current filters</p></div>
                    <div className="admin-list-controls">
                        <form className="admin-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
                            <input aria-label="Search products" placeholder="Search name or ID" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
                            <button type="submit">Search</button>
                        </form>
                        <select aria-label="Filter product status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
                    </div>
                </div>
                {loading ? <div className="admin-loading">Loading products…</div> : products.length === 0 ? <div className="admin-empty-state">No products found for these filters.</div> : (
                    <div className="admin-table-scroll">
                        <table className="admin-data-table">
                            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>{products.map((product) => (
                                <tr key={product.id}>
                                    <td><div className="admin-product-cell">{product.image ? <img src={getImageUrl(product.image)} alt="" /> : <span className="admin-product-placeholder">◇</span>}<span><strong>{product.name}</strong><small>ID #{product.id}</small></span></div></td>
                                    <td>{product.category_name || '—'}</td>
                                    <td><strong>{money(product.on_sale && Number(product.sale_price) > 0 ? product.sale_price : product.price)}</strong>{Boolean(Number(product.on_sale)) && <small className="admin-table-secondary">Sale price</small>}</td>
                                    <td><span className={Number(product.stock) < 5 ? 'admin-stock-low' : ''}>{product.stock ?? 0}</span></td>
                                    <td><span className={`admin-status ${product.status === 'active' ? 'status-active' : 'status-inactive'}`}>{product.status || 'unknown'}</span></td>
                                    <td><div className="admin-row-actions"><button type="button" className="admin-small-button" onClick={() => startEdit(product)}>Edit</button><button type="button" className="admin-small-button muted" onClick={() => changeStatus(product)}>{product.status === 'active' ? 'Deactivate' : 'Activate'}</button></div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
