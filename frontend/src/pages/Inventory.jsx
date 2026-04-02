import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Sidebar from '../components/Sidebar';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { Modal, Button } from 'react-bootstrap';
import { exportToExcel } from '../utils/exportUtils';

const Inventory = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentItemId, setCurrentItemId] = useState(null);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/inventory');
            setInventory(data);
        } catch (error) {
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleClose = () => {
        setShowModal(false);
        reset();
        setEditMode(false);
        setCurrentItemId(null);
    };

    const handleShowNew = () => {
        reset();
        setEditMode(false);
        setShowModal(true);
    };

    const handleEdit = (item) => {
        setEditMode(true);
        setCurrentItemId(item._id);
        Object.keys(item).forEach(key => setValue(key, item[key]));
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await api.delete(`/inventory/${id}`);
                toast.success('Item deleted');
                fetchInventory();
            } catch (error) {
                toast.error('Failed to delete item');
            }
        }
    };

    const onSubmit = async (data) => {
        try {
            if (editMode) {
                await api.put(`/inventory/${currentItemId}`, data);
                toast.success('Item updated');
            } else {
                await api.post('/inventory', data);
                toast.success('Item added');
            }
            handleClose();
            fetchInventory();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    return (
        <div className="d-flex">
            <Sidebar />
            <div className="main-content flex-grow-1 bg-light">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="fw-bold m-0">Inventory Management</h2>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-success bg-white d-flex align-items-center gap-2" onClick={() => exportToExcel(inventory, 'InventoryData')}>
                            📊 Export Excel
                        </button>
                        <button className="btn-gold" onClick={handleShowNew}>+ Add New Item</button>
                    </div>
                </div>

                <div className="glass-panel bg-white p-4 border-0 animate-fade-in">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-warning" role="status"></div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Category</th>
                                        <th>Metal / Purity</th>
                                        <th>Weight (g)</th>
                                        <th>Stock</th>
                                        <th>Price ($)</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.length === 0 ? (
                                        <tr><td colSpan="7" className="text-center py-4 text-secondary">No items in inventory. Add some!</td></tr>
                                    ) : (
                                        inventory.map(item => (
                                            <tr key={item._id}>
                                                <td className="fw-semibold">{item.itemName}</td>
                                                <td><span className="badge bg-secondary bg-opacity-10 text-secondary border">{item.category}</span></td>
                                                <td>{item.metalType}</td>
                                                <td>{item.weight}</td>
                                                <td>
                                                    <span className={`badge ${item.quantity <= 0 ? 'bg-danger' : item.quantity < 5 ? 'bg-warning text-dark' : 'bg-success'}`}>
                                                        {item.quantity} In Stock
                                                    </span>
                                                </td>
                                                <td className="fw-bold">${item.sellingPrice}</td>
                                                <td className="text-end">
                                                    <button className="btn btn-sm btn-light border me-2" onClick={() => handleEdit(item)}>✏️ Edit</button>
                                                    <button className="btn btn-sm btn-light text-danger border" onClick={() => handleDelete(item._id)}>🗑️</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Add/Edit Modal */}
                <Modal show={showModal} onHide={handleClose} centered backdrop="static">
                    <div className="glass-panel bg-white border-0">
                        <Modal.Header closeButton className="border-bottom-0 pb-0">
                            <Modal.Title className="fw-bold">{editMode ? 'Edit Item' : 'Add New Item'}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <form onSubmit={handleSubmit(onSubmit)} className="d-flex flex-column gap-3" autoComplete="off">
                                <div>
                                    <label className="form-label small fw-semibold">Item Name</label>
                                    <input type="text" className="form-control form-control-glass" {...register('itemName', { required: true })} autoComplete="off" />
                                </div>
                                <div className="row g-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Category</label>
                                        <select className="form-select form-control-glass" {...register('category', { required: true })}>
                                            <option value="Ring">Ring</option>
                                            <option value="Necklace">Necklace</option>
                                            <option value="Bracelet">Bracelet</option>
                                            <option value="Earrings">Earrings</option>
                                            <option value="Chain">Chain</option>
                                            <option value="Pendant">Pendant</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Metal Type</label>
                                        <select className="form-select form-control-glass" {...register('metalType', { required: true })}>
                                            <option value="Gold 22K">Gold 22K</option>
                                            <option value="Gold 24K">Gold 24K</option>
                                            <option value="Gold 18K">Gold 18K</option>
                                            <option value="Silver 925">Silver 925</option>
                                            <option value="Platinum">Platinum</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row g-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Weight (Grams)</label>
                                        <input type="number" step="0.01" className="form-control form-control-glass" {...register('weight', { required: true })} autoComplete="off" />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Quantity</label>
                                        <input type="number" className="form-control form-control-glass" {...register('quantity', { required: true })} autoComplete="off" />
                                    </div>
                                </div>
                                <div className="row g-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Purchase Price</label>
                                        <input type="number" className="form-control form-control-glass" {...register('purchasePrice', { required: true })} autoComplete="off" />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-semibold">Selling Price</label>
                                        <input type="number" className="form-control form-control-glass" {...register('sellingPrice', { required: true })} autoComplete="off" />
                                    </div>
                                </div>
                                <div className="mt-3 d-flex justify-content-end gap-2">
                                    <Button variant="secondary" className="btn-secondary-glass" onClick={handleClose}>Cancel</Button>
                                    <Button type="submit" className="btn-gold">{editMode ? 'Save Changes' : 'Add Item'}</Button>
                                </div>
                            </form>
                        </Modal.Body>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default Inventory;
