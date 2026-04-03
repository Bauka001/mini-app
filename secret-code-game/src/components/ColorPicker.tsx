import React from 'react';

interface ColorPickerProps {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
  shapes?: string[];
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  shapes
}) => {
  const getColorStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      red: 'bg-red-500',
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      pink: 'bg-pink-500',
      cyan: 'bg-cyan-500'
    };
    return colorMap[color] || 'bg-gray-500';
  };

  const getShapeStyle = (shape: string) => {
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-none';
      case 'star':
        return 'clip-star';
      default:
        return 'rounded-full';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <h3 className="text-lg font-semibold mb-4">Түстер таңдау</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Түстер</h4>
          <div className="grid grid-cols-4 gap-3">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => onColorSelect(color)}
                className={`w-12 h-12 ${getColorStyle(color)} rounded-full border-4 transition-all duration-200 hover:scale-110 ${
                  selectedColor === color
                    ? 'border-gray-800 scale-110 shadow-lg'
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                title={color}
              />
            ))}
          </div>
        </div>

        {shapes && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Пішіндер (Hard+ режим)</h4>
            <div className="grid grid-cols-3 gap-3">
              {shapes.map((shape) => (
                <button
                  key={shape}
                  className={`w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 ${getShapeStyle(shape)} border-2 border-gray-300 hover:border-gray-500 transition-all duration-200 hover:scale-110`}
                  title={shape}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Кеңестер:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Қара нүкте: түсі де, орны да дұрыс</li>
          <li>• Ақ нүкте: түсі дұрыс, бірақ орны қате</li>
          <li>• Бос орын: мұндай түс жоқ</li>
        </ul>
      </div>
    </div>
  );
};

export default ColorPicker;