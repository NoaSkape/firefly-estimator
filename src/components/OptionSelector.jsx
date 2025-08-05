import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { OPTIONS } from '../data/options';

export default function OptionSelector({ selectedItems, onSelectionChange }) {
  // Track which subject is open
  const [openSubject, setOpenSubject] = useState(null);

  const toggleSubject = (subject) => {
    setOpenSubject(openSubject === subject ? null : subject);
  };

  const toggleItem = (subject, item) => {
    const exists = selectedItems.some((i) => i.id === item.id);
    let updated;
    if (exists) {
      updated = selectedItems.filter((i) => i.id !== item.id);
    } else {
      updated = [...selectedItems, { ...item, subject }];
    }
    onSelectionChange(updated);
  };

  return (
    <div className="space-y-4">
      {OPTIONS.map(({ subject, items }) => (
        <div key={subject} className="border rounded shadow-sm">
          {/* Header */}
          <button
            type="button"
            onClick={() => toggleSubject(subject)}
            className="w-full flex justify-between items-center bg-gray-100 px-4 py-2 text-left font-semibold"
          >
            <span>{subject}</span>
            <span>{openSubject === subject ? '▾' : '▸'}</span>
          </button>

          {/* Accordion panel */}
          {openSubject === subject && (
            <div className="p-4 grid gap-3">
              {items.map((item) => {
                const checked = selectedItems.some((i) => i.id === item.id);
                return (
                  <label key={item.id} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(subject, item)}
                      className="mt-1"
                    />
                    <div>
                      <div className={`font-medium ${item.isPackage ? 'text-blue-600' : ''}`}>
                        {item.name} (${item.price.toLocaleString()})
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

OptionSelector.propTypes = {
  selectedItems: PropTypes.array.isRequired,
  onSelectionChange: PropTypes.func.isRequired,
}; 