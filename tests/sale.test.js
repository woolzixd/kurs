let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`     Ошибка: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn, expectedMessage) {
  try {
    fn();
    throw new Error('Исключение не выброшено');
  } catch (e) {
    if (expectedMessage && !e.message.includes(expectedMessage)) {
      throw new Error(`Ожидалось сообщение "${expectedMessage}", получено "${e.message}"`);
    }
  }
}

const mockDb = {
  cars: [
    { id: 1, brand: 'Toyota', model: 'Camry', vin: 'VIN001', price: 3500000, status: 'available' },
    { id: 2, brand: 'BMW', model: 'X5', vin: 'VIN002', price: 7100000, status: 'sold' },
    { id: 3, brand: 'Kia', model: 'Rio', vin: 'VIN003', price: 1800000, status: 'available' }
  ],
  sales: []
};

function processSale(db, carId, finalPrice) {
  const car = db.cars.find(c => c.id === carId);
  if (!car) throw new Error('Автомобиль не найден');
  if (car.status !== 'available') throw new Error('Автомобиль уже продан');
  if (finalPrice <= 0) throw new Error('Цена должна быть больше 0');

  car.status = 'sold';
  const sale = {
    id: db.sales.length + 1,
    car_id: carId,
    final_price: finalPrice,
    date: new Date().toISOString()
  };
  db.sales.push(sale);
  return sale;
}

console.log('\n📋 МОДУЛЬНЫЕ ТЕСТЫ: SaleService.processSale()\n');

console.log('T-001: Успешная продажа доступного авто');
test('Создаёт запись о продаже', () => {
  const db = JSON.parse(JSON.stringify(mockDb)); // копия
  const sale = processSale(db, 1, 3500000);
  assertEqual(sale.car_id, 1);
  assertEqual(db.sales.length, 1);
});
test('Меняет статус авто на "sold"', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  processSale(db, 1, 3500000);
  assertEqual(db.cars.find(c => c.id === 1).status, 'sold');
});

console.log('\nT-002: Продажа уже проданного авто');
test('Выбрасывает исключение', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  assertThrows(() => processSale(db, 2, 7100000), 'уже продан');
});
test('Не создаёт новую запись', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  try { processSale(db, 2, 7100000); } catch (e) {}
  assertEqual(db.sales.length, 0);
});

console.log('\nT-003: Несуществующий авто');
test('Выбрасывает исключение "не найден"', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  assertThrows(() => processSale(db, 999, 1000000), 'не найден');
});

console.log('\nT-004: Отрицательная цена');
test('Выбрасывает исключение', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  assertThrows(() => processSale(db, 1, -100), 'больше 0');
});

console.log('\nT-005: Нулевая цена');
test('Выбрасывает исключение', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  assertThrows(() => processSale(db, 1, 0), 'больше 0');
});

console.log('\nT-006: Откат при ошибке');
test('Статус авто не меняется при ошибке', () => {
  const db = JSON.parse(JSON.stringify(mockDb));
  try { processSale(db, 999, 5000000); } catch (e) {}
  assertEqual(db.cars.find(c => c.id === 1).status, 'available');
});

console.log(`\n${'═'.repeat(40)}`);
console.log(`✅ Пройдено: ${passed}`);
console.log(`❌ Провалено: ${failed}`);
console.log(`📊 Всего: ${passed + failed}`);