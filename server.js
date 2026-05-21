const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'autosalon-secret-2024';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Токен истек' });
  }
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.role });
});

app.get('/api/cars', authMiddleware, (req, res) => {
  const { search, status, brand, sortBy, sortOrder } = req.query;
  let query = 'SELECT c.*, s.company_name as supplier FROM cars c LEFT JOIN suppliers s ON c.supplier_id = s.id WHERE 1=1';
  const params = [];
  if (status && status !== 'all') { query += ' AND c.status = ?'; params.push(status); }
  if (brand && brand !== 'all') { query += ' AND c.brand = ?'; params.push(brand); }
  if (search) { query += ' AND (c.vin LIKE ? OR c.brand LIKE ? OR c.model LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const allowedSort = ['id','vin','brand','model','year','price','status'];
  if (sortBy && allowedSort.includes(sortBy)) {
    query += ` ORDER BY c.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  } else {
    query += ' ORDER BY c.id DESC';
  }
  res.json(db.prepare(query).all(...params));
});

app.get('/api/cars/available', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT id, vin, brand, model, year, price, color FROM cars WHERE status=? ORDER BY brand, model').all('available'));
});

app.get('/api/cars/brands', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT DISTINCT brand FROM cars ORDER BY brand').all().map(r => r.brand));
});

app.get('/api/cars/:id', authMiddleware, (req, res) => {
  const car = db.prepare('SELECT * FROM cars WHERE id=?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Не найден' });
  res.json(car);
});

app.post('/api/cars', authMiddleware, (req, res) => {
  const { vin, brand, model, year, price, color, supplier_id } = req.body;
  if (!vin || !brand || !model || !year || !price) return res.status(400).json({ error: 'Все поля обязательны' });
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return res.status(400).json({ error: 'Некорректный VIN (17 символов, без I,O,Q)' });
  try {
    const r = db.prepare('INSERT INTO cars (vin,brand,model,year,price,color,supplier_id) VALUES (?,?,?,?,?,?,?)').run(vin.toUpperCase(), brand, model, year, price, color, supplier_id || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Автомобиль с таким VIN уже существует' });
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/cars/:id', authMiddleware, (req, res) => {
  const { brand, model, year, price, color, supplier_id } = req.body;
  db.prepare('UPDATE cars SET brand=?,model=?,year=?,price=?,color=?,supplier_id=? WHERE id=?').run(brand, model, year, price, color, supplier_id || null, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/cars/:id', authMiddleware, (req, res) => {
  const car = db.prepare('SELECT status, brand, model FROM cars WHERE id=?').get(req.params.id);
  if (!car) return res.status(404).json({ error: 'Не найден' });
  if (car.status === 'sold') return res.status(400).json({ error: `Нельзя удалить проданный автомобиль ${car.brand} ${car.model}` });
  db.prepare('DELETE FROM cars WHERE id=?').run(req.params.id);
  res.json({ ok: true, message: `Автомобиль ${car.brand} ${car.model} удалён` });
});

app.get('/api/clients', authMiddleware, (req, res) => {
  const { search } = req.query;
  if (search) {
    return res.json(db.prepare('SELECT * FROM clients WHERE full_name LIKE ? OR phone LIKE ? ORDER BY id DESC').all(`%${search}%`, `%${search}%`));
  }
  res.json(db.prepare('SELECT * FROM clients ORDER BY id DESC').all());
});

app.post('/api/clients', authMiddleware, (req, res) => {
  const { full_name, phone, passport, address } = req.body;
  if (!full_name || !phone) return res.status(400).json({ error: 'ФИО и телефон обязательны' });
  try {
    const r = db.prepare('INSERT INTO clients (full_name,phone,passport,address) VALUES (?,?,?,?)').run(full_name, phone, passport || null, address || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Клиент с таким паспортом уже существует' });
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/clients/:id', authMiddleware, (req, res) => {
  const { full_name, phone, passport, address } = req.body;
  db.prepare('UPDATE clients SET full_name=?,phone=?,passport=?,address=? WHERE id=?').run(full_name, phone, passport, address, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/clients/:id', authMiddleware, (req, res) => {
  const client = db.prepare('SELECT full_name FROM clients WHERE id=?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Не найден' });
  db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
  res.json({ ok: true, message: `Клиент ${client.full_name} удалён` });
});

app.get('/api/employees', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM employees ORDER BY id DESC').all());
});

app.post('/api/employees', authMiddleware, (req, res) => {
  const { full_name, position, phone } = req.body;
  if (!full_name || !position) return res.status(400).json({ error: 'ФИО и должность обязательны' });
  const r = db.prepare('INSERT INTO employees (full_name,position,phone) VALUES (?,?,?)').run(full_name, position, phone || null);
  res.status(201).json({ id: r.lastInsertRowid });
});

app.put('/api/employees/:id', authMiddleware, (req, res) => {
  const { full_name, position, phone } = req.body;
  db.prepare('UPDATE employees SET full_name=?,position=?,phone=? WHERE id=?').run(full_name, position, phone, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/employees/:id', authMiddleware, (req, res) => {
  const emp = db.prepare('SELECT full_name FROM employees WHERE id=?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Не найден' });
  db.prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
  res.json({ ok: true, message: `Сотрудник ${emp.full_name} удалён` });
});

app.get('/api/suppliers', authMiddleware, (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all());
});

app.post('/api/suppliers', authMiddleware, (req, res) => {
  const { company_name, inn, contact_person, phone } = req.body;
  if (!company_name || !inn) return res.status(400).json({ error: 'Название и ИНН обязательны' });
  try {
    const r = db.prepare('INSERT INTO suppliers (company_name,inn,contact_person,phone) VALUES (?,?,?,?)').run(company_name, inn, contact_person || null, phone || null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Поставщик с таким ИНН уже существует' });
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/suppliers/:id', authMiddleware, (req, res) => {
  const { company_name, inn, contact_person, phone } = req.body;
  db.prepare('UPDATE suppliers SET company_name=?,inn=?,contact_person=?,phone=? WHERE id=?').run(company_name, inn, contact_person, phone, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/suppliers/:id', authMiddleware, (req, res) => {
  const sup = db.prepare('SELECT company_name FROM suppliers WHERE id=?').get(req.params.id);
  if (!sup) return res.status(404).json({ error: 'Не найден' });
  db.prepare('DELETE FROM suppliers WHERE id=?').run(req.params.id);
  res.json({ ok: true, message: `Поставщик ${sup.company_name} удалён` });
});

app.get('/api/sales', authMiddleware, (req, res) => {
  const { start, end, employee_id } = req.query;
  let query = `
    SELECT s.*, c.brand, c.model, c.vin, c.year as car_year, c.color,
           cl.full_name as client, cl.phone as client_phone,
           e.full_name as employee
    FROM sales s
    JOIN cars c ON s.car_id = c.id
    JOIN clients cl ON s.client_id = cl.id
    JOIN employees e ON s.employee_id = e.id
    WHERE 1=1`;
  const params = [];
  if (start) { query += ' AND s.sale_date >= ?'; params.push(start); }
  if (end) { query += ' AND s.sale_date <= ?'; params.push(end); }
  if (employee_id) { query += ' AND s.employee_id = ?'; params.push(employee_id); }
  query += ' ORDER BY s.sale_date DESC, s.id DESC';
  res.json(db.prepare(query).all(...params));
});

app.get('/api/sales/:id', authMiddleware, (req, res) => {
  const sale = db.prepare(`
    SELECT s.*, c.brand, c.model, c.vin, c.year as car_year, c.color,
           cl.full_name as client, cl.phone as client_phone, cl.passport as client_passport, cl.address as client_address,
           e.full_name as employee, e.position as employee_position
    FROM sales s
    JOIN cars c ON s.car_id = c.id
    JOIN clients cl ON s.client_id = cl.id
    JOIN employees e ON s.employee_id = e.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Сделка не найдена' });
  res.json(sale);
});

app.post('/api/sales', authMiddleware, (req, res) => {
  const { car_id, client_id, employee_id, final_price, sale_date, payment_method, comment } = req.body;
  if (!car_id || !client_id || !employee_id || !final_price) {
    return res.status(400).json({ error: 'Все поля обязательны: автомобиль, клиент, сотрудник, цена' });
  }

  const create = db.transaction(() => {
    const car = db.prepare('SELECT * FROM cars WHERE id=?').get(car_id);
    if (!car) throw new Error('Автомобиль не найден');
    if (car.status !== 'available') throw new Error(`Автомобиль ${car.brand} ${car.model} уже продан`);
    if (final_price <= 0) throw new Error('Цена должна быть больше 0');

    const date = sale_date || new Date().toISOString().split('T')[0];
    const r = db.prepare('INSERT INTO sales (car_id,client_id,employee_id,final_price,sale_date,payment_method,comment) VALUES (?,?,?,?,?,?,?)')
      .run(car_id, client_id, employee_id, final_price, date, payment_method || 'cash', comment || null);
    db.prepare('UPDATE cars SET status=? WHERE id=?').run('sold', car_id);
    return { id: r.lastInsertRowid, car: `${car.brand} ${car.model}`, vin: car.vin };
  });

  try {
    const result = create();
    res.status(201).json({ ...result, message: 'Сделка оформлена успешно' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/reports/sales', authMiddleware, (req, res) => {
  const { start, end } = req.query;
  const rows = db.prepare(`
    SELECT s.*, c.brand, c.model, c.vin, cl.full_name as client, e.full_name as employee
    FROM sales s JOIN cars c ON s.car_id=c.id JOIN clients cl ON s.client_id=cl.id JOIN employees e ON s.employee_id=e.id
    WHERE s.sale_date BETWEEN ? AND ? ORDER BY s.sale_date DESC
  `).all(start || '2000-01-01', end || '2099-12-31');

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      SUM(final_price) as total_sum,
      AVG(final_price) as avg_price,
      MIN(final_price) as min_price,
      MAX(final_price) as max_price
    FROM sales WHERE sale_date BETWEEN ? AND ?
  `).get(start || '2000-01-01', end || '2099-12-31');

  const byEmployee = db.prepare(`
    SELECT e.full_name, COUNT(*) as count, SUM(s.final_price) as total
    FROM sales s JOIN employees e ON s.employee_id=e.id
    WHERE s.sale_date BETWEEN ? AND ? GROUP BY e.id ORDER BY total DESC
  `).all(start || '2000-01-01', end || '2099-12-31');

  const byBrand = db.prepare(`
    SELECT c.brand, COUNT(*) as count, SUM(s.final_price) as total
    FROM sales s JOIN cars c ON s.car_id=c.id
    WHERE s.sale_date BETWEEN ? AND ? GROUP BY c.brand ORDER BY total DESC
  `).all(start || '2000-01-01', end || '2099-12-31');

  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', s.sale_date) as month, COUNT(*) as count, SUM(s.final_price) as total
    FROM sales s WHERE s.sale_date BETWEEN ? AND ? GROUP BY month ORDER BY month
  `).all(start || '2000-01-01', end || '2099-12-31');

  res.json({ rows, summary, byEmployee, byBrand, byMonth });
});

app.get('/api/dashboard', authMiddleware, (req, res) => {
  const availableCars = db.prepare('SELECT COUNT(*) as count FROM cars WHERE status=?').get('available').count;
  const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
  const monthStart = new Date().toISOString().slice(0, 8) + '01';
  const today = new Date().toISOString().split('T')[0];
  const monthSales = db.prepare('SELECT COUNT(*) as count, SUM(final_price) as total FROM sales WHERE sale_date BETWEEN ? AND ?').get(monthStart, today);
  const recentSales = db.prepare(`
    SELECT s.*, c.brand, c.model, cl.full_name as client
    FROM sales s JOIN cars c ON s.car_id=c.id JOIN clients cl ON s.client_id=cl.id
    ORDER BY s.sale_date DESC, s.id DESC LIMIT 5
  `).all();
  const topEmployees = db.prepare(`
    SELECT e.full_name, COUNT(*) as count, SUM(s.final_price) as total
    FROM sales s JOIN employees e ON s.employee_id=e.id
    WHERE s.sale_date BETWEEN ? AND ? GROUP BY e.id ORDER BY total DESC LIMIT 5
  `).all(monthStart, today);
  const salesByMonth = db.prepare(`
    SELECT strftime('%Y-%m', sale_date) as month, COUNT(*) as count, SUM(final_price) as total
    FROM sales GROUP BY month ORDER BY month DESC LIMIT 6
  `).all();

  res.json({ availableCars, totalClients, totalEmployees, monthSales, recentSales, topEmployees, salesByMonth });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});