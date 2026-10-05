export const activityCategories = [
  'Ăn uống',
  'Thể thao',
  'Du lịch',
  'Giải trí',
  'Học tập',
  'Gaming',
  'Âm nhạc',
  'Nghệ thuật',
  'Thiên nhiên',
  'Tình nguyện',
  'Công nghệ',
  'Networking',
];

export const activityLocations: Record<string, string[]> = {
  'TP. Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Phú Nhuận', 'Gò Vấp', 'Thủ Đức'],
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Tây Hồ', 'Nam Từ Liêm'],
  'Đà Nẵng': ['Hải Châu', 'Sơn Trà', 'Ngũ Hành Sơn', 'Thanh Khê', 'Liên Chiểu'],
  'Lâm Đồng': ['Đà Lạt', 'Bảo Lộc', 'Đức Trọng', 'Lạc Dương'],
  'Hải Phòng': ['Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Hải An', 'Đồ Sơn'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt'],
  'Khánh Hòa': ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Diên Khánh'],
  'Quảng Ninh': ['Hạ Long', 'Cẩm Phả', 'Uông Bí', 'Móng Cái'],
  'Thừa Thiên Huế': ['Huế', 'Hương Thủy', 'Hương Trà', 'Phú Vang'],
  'Bà Rịa - Vũng Tàu': ['Vũng Tàu', 'Bà Rịa', 'Phú Mỹ', 'Long Điền'],
};

export const provinces = Object.keys(activityLocations);
