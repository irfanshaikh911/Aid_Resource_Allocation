import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: string, quantity: number) => void;
}

const AddInventoryDialog: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [selectedItem, setSelectedItem] = useState('Medical Kits');
  const [quantity, setQuantity] = useState(0);

  const inventoryItems = [
    'Medical Kits',
    'Emergency Kits',
    'Food Packets',
    'Water Bottles',
    'Inflatable Tubes',
    'Blankets'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(selectedItem, quantity);
    setQuantity(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Add to Inventory</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Item
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                {inventoryItems.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default AddInventoryDialog;