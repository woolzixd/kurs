const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

let dbPath;
if (typeof process !== 'undefined' && process.resourcesPath) {
  const userDataPath = path.join(require('electron').app.getPath('userData'), 'database.db');
  if (!fs.existsSync(userDataPath)) {
    const resourceDb = path.join(process.resourcesPath, 'database.db');
    if (fs.existsSync(resourceDb)) {
      fs.copyFileSync(resourceDb, userDataPath);
    }
  }
  dbPath = userDataPath;
} else if (typeof require !== 'undefined') {
  try {
    const { app } = require('electron');
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'database.db');
  } catch (e) {
    dbPath = path.join(__dirname, 'database.db');
  }
} else {
  dbPath = path.join(__dirname, 'database.db');
}

console.log('База данных:', dbPath);
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    inn TEXT UNIQUE NOT NULL,
    contact_person TEXT,
    phone TEXT
  );

  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vin TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    price REAL NOT NULL,
    color TEXT,
    status TEXT DEFAULT 'available' CHECK(status IN ('available','sold')),
    supplier_id INTEGER REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    passport TEXT UNIQUE,
    address TEXT
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,
    phone TEXT
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER NOT NULL REFERENCES cars(id),
    client_id INTEGER NOT NULL REFERENCES clients(id),
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    sale_date TEXT NOT NULL DEFAULT (date('now')),
    final_price REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash','card','credit')),
    comment TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  );

  CREATE INDEX IF NOT EXISTS idx_cars_vin ON cars(vin);
  CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
  CREATE INDEX IF NOT EXISTS idx_cars_brand ON cars(brand);
  CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
`);

const adminExists = db.prepare('SELECT id FROM users WHERE username=?').get('admin');
if (!adminExists) {
  db.prepare('INSERT INTO users (username,password_hash,role) VALUES (?,?,?)').run('admin', bcrypt.hashSync('admin123', 10), 'admin');
}

const carCount = db.prepare('SELECT COUNT(*) as c FROM cars').get();
if (carCount.c === 0) {
  console.log('Заполняю тестовыми данными...');
  
  db.prepare("INSERT INTO suppliers (id,company_name,inn,contact_person,phone) VALUES (1,'ООО АвтоИмпорт','7701234567','Петров Алексей Александрович','+7-999-111-22-33')").run();
  db.prepare("INSERT INTO suppliers (id,company_name,inn,contact_person,phone) VALUES (2,'ЗАО МоторсГрупп','7707654321','Сидоров Борис Борисович','+7-999-444-55-66')").run();
  db.prepare("INSERT INTO suppliers (id,company_name,inn,contact_person,phone) VALUES (3,'ООО АвтоТрейд','7709988776','Козлова Елена Игоревна','+7-999-777-88-99')").run();
  db.prepare("INSERT INTO suppliers (id,company_name,inn,contact_person,phone) VALUES (4,'ПАО ТехноАвто','7711123456','Морозов Дмитрий Сергеевич','+7-999-333-22-11')").run();
  db.prepare("INSERT INTO suppliers (id,company_name,inn,contact_person,phone) VALUES (5,'ООО ПремиумАвто','7705544332','Фёдорова Анна Владимировна','+7-999-888-77-66')").run();

  db.prepare("INSERT INTO employees (id,full_name,position,phone) VALUES (1,'Иванов Иван Иванович','Менеджер по продажам','+7-900-123-45-67')").run();
  db.prepare("INSERT INTO employees (id,full_name,position,phone) VALUES (2,'Смирнова Анна Петровна','Старший менеджер','+7-900-987-65-43')").run();
  db.prepare("INSERT INTO employees (id,full_name,position,phone) VALUES (3,'Кузнецов Михаил Сергеевич','Менеджер по продажам','+7-900-555-44-33')").run();
  db.prepare("INSERT INTO employees (id,full_name,position,phone) VALUES (4,'Попова Елена Викторовна','Администратор','+7-900-222-33-44')").run();
  db.prepare("INSERT INTO employees (id,full_name,position,phone) VALUES (5,'Васильев Дмитрий Андреевич','Менеджер по продажам','+7-900-111-55-77')").run();
  db.prepare("INSERT INTO employees (id,full_name,position,phone) VALUES (6,'Николаева Ольга Игоревна','Финансовый менеджер','+7-900-888-99-00')").run();

  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (1,'Кузнецов Сергей Викторович','+7-916-111-22-33','4510 123456','г. Москва, ул. Ленина, д.1, кв.10')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (2,'Попова Елена Андреевна','+7-916-444-55-66','4510 654321','г. Москва, ул. Мира, д.10, кв.25')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (3,'Соколов Артём Дмитриевич','+7-916-777-88-99','4511 112233','г. Москва, пр-т Вернадского, д.45, кв.78')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (4,'Морозова Татьяна Сергеевна','+7-916-333-44-55','4512 445566','г. Москва, ул. Тверская, д.15, кв.5')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (5,'Волков Александр Павлович','+7-916-666-77-88','4513 778899','г. Химки, ул. Московская, д.3, кв.12')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (6,'Козлова Мария Игоревна','+7-916-999-00-11','4514 001122','г. Королёв, ул. Ленина, д.20, кв.33')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (7,'Новиков Игорь Владимирович','+7-915-222-33-44','4515 334455','г. Москва, ул. Пушкина, д.8, кв.55')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (8,'Фёдорова Светлана Николаевна','+7-915-555-66-77','4516 667788','г. Мытищи, ул. Центральная, д.7, кв.9')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (9,'Григорьев Денис Алексеевич','+7-915-888-99-00','4517 990011','г. Балашиха, ул. Лесная, д.12, кв.40')").run();
  db.prepare("INSERT INTO clients (id,full_name,phone,passport,address) VALUES (10,'Белова Анна Александровна','+7-915-111-22-00','4518 223344','г. Москва, ул. Садовая, д.30, кв.15')").run();

  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (1,'JTNBE46KX7300001','Toyota','Camry',2023,3500000,'Белый','sold',1)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (2,'WBA3A5C50DF000002','BMW','X5',2024,7200000,'Черный','sold',2)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (3,'KNADM4A35E6000003','Kia','Rio',2022,1800000,'Красный','available',1)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (4,'XW8ZZZ61ZEG000004','Volkswagen','Tiguan',2023,3200000,'Серебристый','available',2)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (5,'Z94C41BBFGR000005','Hyundai','Tucson',2024,2900000,'Синий','available',1)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (6,'JTMBD33VX76000006','Toyota','RAV4',2024,4200000,'Черный','available',3)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (7,'WBA5A7C5XFG000007','BMW','X7',2024,11000000,'Белый','available',2)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (8,'WVWZZZ3CZHE000008','Volkswagen','Passat',2023,3500000,'Серый','sold',4)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (9,'KMHD841EMJU000009','Hyundai','Sonata',2023,2800000,'Белый','available',3)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (10,'SALWA2EEXHA000010','Land Rover','Range Rover',2024,15000000,'Черный','available',5)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (11,'WAUZZZ4G9FN000011','Audi','A6',2023,5500000,'Синий','available',3)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (12,'VF1RFE00X62000012','Renault','Duster',2022,2100000,'Оранжевый','available',4)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (13,'Z8N4B41DBG000013','Nissan','Qashqai',2024,3300000,'Зеленый','available',1)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (14,'XTA211030K0000014','Lada','Vesta',2024,1800000,'Белый','available',4)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (15,'YS3FB49YX41000015','Saab','9-3',2021,1500000,'Красный','available',5)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (16,'JN1TBNT32U0000016','Nissan','X-Trail',2024,3800000,'Серебристый','available',2)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (17,'WDD2040071F000017','Mercedes-Benz','C-Class',2023,4800000,'Черный','available',5)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (18,'JM0KE107200000018','Mazda','CX-5',2023,3100000,'Красный','sold',3)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (19,'WBA3B3G5XDNS00019','BMW','3 Series',2024,5100000,'Белый','available',2)").run();
  db.prepare("INSERT INTO cars (id,vin,brand,model,year,price,color,status,supplier_id) VALUES (20,'JTJAM7BX0M3000020','Lexus','RX',2024,8900000,'Серый','available',5)").run();

  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (1,1,1,1,'2026-04-15',3450000,'card','Скидка 50 тыс. за trade-in')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (2,2,2,2,'2026-04-10',7100000,'credit','Кредит Сбербанка на 5 лет')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (3,8,3,1,'2026-03-22',3450000,'cash','Оплата наличными полностью')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (4,18,4,3,'2026-03-15',3050000,'card','')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (5,6,5,5,'2026-02-28',4180000,'credit','Кредит ВТБ на 3 года')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (6,7,6,2,'2026-02-10',10900000,'card','VIP-клиент, доп. оборудование')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (7,11,7,1,'2026-01-20',5400000,'cash','')").run();
  db.prepare("INSERT INTO sales (id,car_id,client_id,employee_id,sale_date,final_price,payment_method,comment) VALUES (8,17,8,3,'2026-01-08',4750000,'card','Скидка корпоративному клиенту')").run();
}

module.exports = db;