const http = require('http');

const API = 'http://localhost:3000';
let token = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('\n📋 ИНТЕГРАЦИОННЫЕ ТЕСТЫ API\n');

  console.log('1. Авторизация');
  const loginRes = await request('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });

  if (loginRes.status === 200 && loginRes.body.token) {
    token = loginRes.body.token;
    console.log('   ✅ Логин успешен, токен получен');
  } else {
    console.log('   ❌ Ошибка авторизации:', loginRes.body);
    console.log('   ⚠️ Убедитесь, что сервер запущен на http://localhost:3000');
    return;
  }

  console.log('\n2. GET /api/cars');
  const carsRes = await request('GET', '/api/cars');
  console.log(`   Статус: ${carsRes.status}`);
  console.log(`   Найдено автомобилей: ${Array.isArray(carsRes.body) ? carsRes.body.length : 'ошибка'}`);
  console.log(carsRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n3. GET /api/cars/available');
  const availRes = await request('GET', '/api/cars/available');
  console.log(`   Статус: ${availRes.status}`);
  console.log(`   Доступно: ${Array.isArray(availRes.body) ? availRes.body.length : 'ошибка'}`);
  console.log(availRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n4. POST /api/clients');
  const clientRes = await request('POST', '/api/clients', {
    full_name: 'Тестов Тест Тестович',
    phone: '+7-999-000-00-00',
    passport: '9999 999999',
    address: 'г. Тест, ул. Тестовая, д.1'
  });
  console.log(`   Статус: ${clientRes.status}`);
  console.log(clientRes.status === 201 ? '   ✅ Клиент создан' : '   ❌ Провален');

  console.log('\n5. GET /api/clients?search=Тестов');
  const searchRes = await request('GET', '/api/clients?search=Тестов');
  console.log(`   Статус: ${searchRes.status}`);
  const found = Array.isArray(searchRes.body) && searchRes.body.some(c => c.full_name.includes('Тестов'));
  console.log(found ? '   ✅ Клиент найден' : '   ❌ Клиент не найден');

  console.log('\n6. GET /api/employees');
  const empRes = await request('GET', '/api/employees');
  console.log(`   Статус: ${empRes.status}`);
  console.log(empRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n7. GET /api/suppliers');
  const supRes = await request('GET', '/api/suppliers');
  console.log(`   Статус: ${supRes.status}`);
  console.log(supRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n8. GET /api/sales');
  const salesRes = await request('GET', '/api/sales');
  console.log(`   Статус: ${salesRes.status}`);
  console.log(salesRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n9. GET /api/dashboard');
  const dashRes = await request('GET', '/api/dashboard');
  console.log(`   Статус: ${dashRes.status}`);
  if (dashRes.body) {
    console.log(`   Авто в наличии: ${dashRes.body.availableCars}`);
    console.log(`   Клиентов: ${dashRes.body.totalClients}`);
  }
  console.log(dashRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n10. GET /api/reports/sales');
  const repRes = await request('GET', '/api/reports/sales');
  console.log(`   Статус: ${repRes.status}`);
  console.log(repRes.status === 200 ? '   ✅ Пройден' : '   ❌ Провален');

  console.log('\n11. POST /api/sales (продажа)');
  if (Array.isArray(availRes.body) && availRes.body.length > 0) {
    const carToSell = availRes.body[0];
    const saleRes = await request('POST', '/api/sales', {
      car_id: carToSell.id,
      client_id: clientRes.body.id,
      employee_id: 1,
      final_price: carToSell.price,
      sale_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      comment: 'Тестовая сделка'
    });
    console.log(`   Статус: ${saleRes.status}`);
    console.log(saleRes.status === 201 ? '   ✅ Сделка оформлена' : `   ❌ ${saleRes.body?.error}`);
  } else {
    console.log('   ⚠️ Нет доступных авто для теста');
  }
}

runTests().catch(console.error);