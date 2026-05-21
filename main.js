const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  const express = require('express');
  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');
  const db = require('./database');

  const server = express();
  const PORT = 3000;
  const JWT_SECRET = 'autosalon-secret-2024';

  server.use(express.json());
  server.use(express.static(path.join(__dirname, 'public')));

  function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Не авторизован' });
    try { req.user = jwt.verify(token, JWT_SECRET); next(); }
    catch (e) { res.status(401).json({ error: 'Токен истек' }); }
  }

  server.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Неверные данные' });
    res.json({ token: jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' }), role: user.role });
  });

  server.get('/api/cars', auth, (req, res) => {
    const { search, status, brand, sortBy, sortOrder } = req.query;
    let q = 'SELECT c.*, s.company_name as supplier FROM cars c LEFT JOIN suppliers s ON c.supplier_id=s.id WHERE 1=1';
    const p = [];
    if (status && status !== 'all') { q += ' AND c.status=?'; p.push(status); }
    if (brand && brand !== 'all') { q += ' AND c.brand=?'; p.push(brand); }
    if (search) { q += ' AND (c.vin LIKE ? OR c.brand LIKE ? OR c.model LIKE ?)'; p.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    
    const allowed = ['id','vin','brand','model','year','price','status'];
    const sort = allowed.includes(sortBy) ? sortBy : 'id';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    q += ` ORDER BY c.${sort} ${order}`;
    
    res.json(db.prepare(q).all(...p));
  });

  server.get('/api/cars/available', auth, (req, res) => {
    res.json(db.prepare('SELECT id,vin,brand,model,year,price,color FROM cars WHERE status=? ORDER BY brand,model').all('available'));
  });

  server.get('/api/cars/brands', auth, (req, res) => {
    res.json(db.prepare('SELECT DISTINCT brand FROM cars ORDER BY brand').all().map(r => r.brand));
  });

  server.post('/api/cars', auth, (req, res) => {
    const { vin, brand, model, year, price, color, supplier_id } = req.body;
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return res.status(400).json({ error: 'Некорректный VIN' });
    try {
      const r = db.prepare('INSERT INTO cars (vin,brand,model,year,price,color,supplier_id) VALUES (?,?,?,?,?,?,?)').run(vin.toUpperCase(), brand, model, year, price, color, supplier_id || null);
      res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(400).json({ error: 'VIN уже существует' }); }
  });

  server.put('/api/cars/:id', auth, (req, res) => {
    const { brand, model, year, price, color, supplier_id } = req.body;
    db.prepare('UPDATE cars SET brand=?,model=?,year=?,price=?,color=?,supplier_id=? WHERE id=?').run(brand, model, year, price, color, supplier_id || null, req.params.id);
    res.json({ ok: true });
  });

  server.delete('/api/cars/:id', auth, (req, res) => {
    const car = db.prepare('SELECT status FROM cars WHERE id=?').get(req.params.id);
    if (!car) return res.status(404).json({ error: 'Не найден' });
    if (car.status === 'sold') return res.status(400).json({ error: 'Нельзя удалить проданный' });
    db.prepare('DELETE FROM cars WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  server.get('/api/clients', auth, (req, res) => {
    const { search } = req.query;
    if (search) return res.json(db.prepare('SELECT * FROM clients WHERE full_name LIKE ? OR phone LIKE ? ORDER BY id DESC').all(`%${search}%`, `%${search}%`));
    res.json(db.prepare('SELECT * FROM clients ORDER BY id DESC').all());
  });

  server.post('/api/clients', auth, (req, res) => {
    const { full_name, phone, passport, address } = req.body;
    try {
      const r = db.prepare('INSERT INTO clients (full_name,phone,passport,address) VALUES (?,?,?,?)').run(full_name, phone, passport || null, address || null);
      res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(400).json({ error: 'Паспорт уже существует' }); }
  });

  server.put('/api/clients/:id', auth, (req, res) => {
    const { full_name, phone, passport, address } = req.body;
    db.prepare('UPDATE clients SET full_name=?,phone=?,passport=?,address=? WHERE id=?').run(full_name, phone, passport, address, req.params.id);
    res.json({ ok: true });
  });

  server.delete('/api/clients/:id', auth, (req, res) => {
    db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  server.get('/api/employees', auth, (req, res) => {
    res.json(db.prepare('SELECT * FROM employees ORDER BY id DESC').all());
  });

  server.post('/api/employees', auth, (req, res) => {
    const { full_name, position, phone } = req.body;
    const r = db.prepare('INSERT INTO employees (full_name,position,phone) VALUES (?,?,?)').run(full_name, position, phone || null);
    res.status(201).json({ id: r.lastInsertRowid });
  });

  server.put('/api/employees/:id', auth, (req, res) => {
    const { full_name, position, phone } = req.body;
    db.prepare('UPDATE employees SET full_name=?,position=?,phone=? WHERE id=?').run(full_name, position, phone, req.params.id);
    res.json({ ok: true });
  });

  server.delete('/api/employees/:id', auth, (req, res) => {
    db.prepare('DELETE FROM employees WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  server.get('/api/suppliers', auth, (req, res) => {
    res.json(db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all());
  });

  server.post('/api/suppliers', auth, (req, res) => {
    const { company_name, inn, contact_person, phone } = req.body;
    try {
      const r = db.prepare('INSERT INTO suppliers (company_name,inn,contact_person,phone) VALUES (?,?,?,?)').run(company_name, inn, contact_person || null, phone || null);
      res.status(201).json({ id: r.lastInsertRowid });
    } catch (e) { res.status(400).json({ error: 'ИНН уже существует' }); }
  });

  server.put('/api/suppliers/:id', auth, (req, res) => {
    const { company_name, inn, contact_person, phone } = req.body;
    db.prepare('UPDATE suppliers SET company_name=?,inn=?,contact_person=?,phone=? WHERE id=?').run(company_name, inn, contact_person, phone, req.params.id);
    res.json({ ok: true });
  });

  server.delete('/api/suppliers/:id', auth, (req, res) => {
    db.prepare('DELETE FROM suppliers WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  server.get('/api/sales', auth, (req, res) => {
    const rows = db.prepare(`
      SELECT s.*, c.brand, c.model, c.vin, c.year as car_year, c.color,
             cl.full_name as client, e.full_name as employee
      FROM sales s JOIN cars c ON s.car_id=c.id JOIN clients cl ON s.client_id=cl.id JOIN employees e ON s.employee_id=e.id
      ORDER BY s.sale_date DESC
    `).all();
    res.json(rows);
  });

  server.post('/api/sales', auth, (req, res) => {
    const { car_id, client_id, employee_id, final_price, sale_date, payment_method, comment } = req.body;
    const create = db.transaction(() => {
      const car = db.prepare('SELECT * FROM cars WHERE id=?').get(car_id);
      if (!car) throw new Error('Авто не найден');
      if (car.status !== 'available') throw new Error('Авто уже продан');
      const r = db.prepare('INSERT INTO sales (car_id,client_id,employee_id,final_price,sale_date,payment_method,comment) VALUES (?,?,?,?,?,?,?)').run(car_id, client_id, employee_id, final_price, sale_date || new Date().toISOString().split('T')[0], payment_method || 'cash', comment || null);
      db.prepare('UPDATE cars SET status=? WHERE id=?').run('sold', car_id);
      return { id: r.lastInsertRowid, car: `${car.brand} ${car.model}` };
    });
    try { res.status(201).json(create()); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  server.get('/api/reports/sales', auth, (req, res) => {
    const { start, end } = req.query;
    const s = start || '2000-01-01';
    const e = end || '2099-12-31';
    
    const rows = db.prepare(`
      SELECT s.*, c.brand, c.model, c.vin, cl.full_name as client, e.full_name as employee
      FROM sales s JOIN cars c ON s.car_id=c.id JOIN clients cl ON s.client_id=cl.id JOIN employees e ON s.employee_id=e.id
      WHERE s.sale_date BETWEEN ? AND ? ORDER BY s.sale_date DESC
    `).all(s, e);
    
    const summary = db.prepare('SELECT COUNT(*) as total_count, COALESCE(SUM(final_price),0) as total_sum, COALESCE(ROUND(AVG(final_price)),0) as avg_price, COALESCE(MIN(final_price),0) as min_price, COALESCE(MAX(final_price),0) as max_price FROM sales WHERE sale_date BETWEEN ? AND ?').get(s, e);
    
    res.json({ rows, summary });
  });

  server.get('/api/dashboard', auth, (req, res) => {
    const a = db.prepare('SELECT COUNT(*) as c FROM cars WHERE status=?').get('available')?.c || 0;
    const cl = db.prepare('SELECT COUNT(*) as c FROM clients').get()?.c || 0;
    const emp = db.prepare('SELECT COUNT(*) as c FROM employees').get()?.c || 0;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date().toISOString().slice(0, 8) + '01';
    const ms = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(final_price),0) as total FROM sales WHERE sale_date BETWEEN ? AND ?').get(monthStart, today) || { count: 0, total: 0 };
    const rec = db.prepare('SELECT s.*, c.brand, c.model, cl.full_name as client FROM sales s JOIN cars c ON s.car_id=c.id JOIN clients cl ON s.client_id=cl.id ORDER BY s.sale_date DESC LIMIT 5').all();
    
    const top = db.prepare(`
      SELECT e.full_name, COUNT(*) as count, COALESCE(SUM(s.final_price),0) as total 
      FROM sales s 
      JOIN employees e ON s.employee_id = e.id 
      WHERE s.sale_date BETWEEN ? AND ? 
      GROUP BY e.id 
      ORDER BY count DESC, total DESC 
      LIMIT 5
    `).all(monthStart, today);
    
    const byMonth = db.prepare("SELECT strftime('%Y-%m', sale_date) as month, COUNT(*) as count, COALESCE(SUM(final_price),0) as total FROM sales GROUP BY month ORDER BY month DESC LIMIT 6").all();

    res.json({ 
      availableCars: a, 
      totalClients: cl, 
      totalEmployees: emp, 
      monthSales: ms, 
      recentSales: rec, 
      topEmployees: top, 
      salesByMonth: byMonth 
    });
  });

  server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  server.get('/api/sales/:id', auth, (req, res) => {
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

  server.listen(PORT, () => {
    console.log('Сервер: http://localhost:' + PORT);
    
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      title: 'DriveCo - Автосалон',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL('http://localhost:' + PORT);
    mainWindow.on('closed', () => { mainWindow = null; });
  });
});

app.on('window-all-closed', () => { app.quit(); });