const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, company_name TEXT NOT NULL, inn TEXT UNIQUE NOT NULL, contact_person TEXT, phone TEXT);
  CREATE TABLE IF NOT EXISTS cars (id INTEGER PRIMARY KEY AUTOINCREMENT, vin TEXT UNIQUE NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL, year INTEGER NOT NULL, price REAL NOT NULL, color TEXT, status TEXT DEFAULT 'available', supplier_id INTEGER REFERENCES suppliers(id));
  CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, phone TEXT NOT NULL, passport TEXT UNIQUE, address TEXT);
  CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, position TEXT NOT NULL, phone TEXT);
  CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, car_id INTEGER NOT NULL REFERENCES cars(id), client_id INTEGER NOT NULL REFERENCES clients(id), employee_id INTEGER NOT NULL REFERENCES employees(id), sale_date TEXT NOT NULL DEFAULT (date('now')), final_price REAL NOT NULL, payment_method TEXT DEFAULT 'cash', comment TEXT);
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'admin');
`);

db.exec('DELETE FROM sales; DELETE FROM cars; DELETE FROM clients; DELETE FROM employees; DELETE FROM suppliers; DELETE FROM users;');

db.prepare("INSERT INTO users (id,username,password_hash,role) VALUES (1,'admin',?,'admin')").run(bcrypt.hashSync('admin123', 10));

db.prepare("INSERT INTO suppliers VALUES (1,'ООО АвтоИмпорт','7701234567','Петров А.А.','+79991112233')").run();
db.prepare("INSERT INTO suppliers VALUES (2,'ЗАО МоторсГрупп','7707654321','Сидоров Б.Б.','+79994445566')").run();
db.prepare("INSERT INTO suppliers VALUES (3,'ООО АвтоТрейд','7709988776','Козлова Е.И.','+79997778899')").run();
db.prepare("INSERT INTO suppliers VALUES (4,'ПАО ТехноАвто','7711123456','Морозов Д.С.','+79993332211')").run();
db.prepare("INSERT INTO suppliers VALUES (5,'ООО ПремиумАвто','7705544332','Фёдорова А.В.','+79998887766')").run();

db.prepare("INSERT INTO employees VALUES (1,'Иванов Иван Иванович','Менеджер','+79001234567')").run();
db.prepare("INSERT INTO employees VALUES (2,'Смирнова Анна Петровна','Старший менеджер','+79009876543')").run();
db.prepare("INSERT INTO employees VALUES (3,'Кузнецов Михаил Сергеевич','Менеджер','+79005554433')").run();
db.prepare("INSERT INTO employees VALUES (4,'Попова Елена Викторовна','Администратор','+79002223344')").run();
db.prepare("INSERT INTO employees VALUES (5,'Васильев Дмитрий Андреевич','Менеджер','+79001115577')").run();
db.prepare("INSERT INTO employees VALUES (6,'Николаева Ольга Игоревна','Финансовый менеджер','+79008889900')").run();

db.prepare("INSERT INTO clients VALUES (1,'Кузнецов Сергей Викторович','+79161112233','4510123456','г. Москва, ул. Ленина, д.1')").run();
db.prepare("INSERT INTO clients VALUES (2,'Попова Елена Андреевна','+79164445566','4510654321','г. Москва, ул. Мира, д.10')").run();
db.prepare("INSERT INTO clients VALUES (3,'Соколов Артём Дмитриевич','+79167778899','4511112233','г. Москва, пр-т Вернадского, д.45')").run();
db.prepare("INSERT INTO clients VALUES (4,'Морозова Татьяна Сергеевна','+79163334455','4512445566','г. Москва, ул. Тверская, д.15')").run();
db.prepare("INSERT INTO clients VALUES (5,'Волков Александр Павлович','+79166667788','4513778899','г. Химки, ул. Московская, д.3')").run();
db.prepare("INSERT INTO clients VALUES (6,'Козлова Мария Игоревна','+79169990011','4514001122','г. Королёв, ул. Ленина, д.20')").run();
db.prepare("INSERT INTO clients VALUES (7,'Новиков Игорь Владимирович','+79152223344','4515334455','г. Москва, ул. Пушкина, д.8')").run();
db.prepare("INSERT INTO clients VALUES (8,'Фёдорова Светлана Николаевна','+79155556677','4516667788','г. Мытищи, ул. Центральная, д.7')").run();
db.prepare("INSERT INTO clients VALUES (9,'Григорьев Денис Алексеевич','+79158889900','4517990011','г. Балашиха, ул. Лесная, д.12')").run();
db.prepare("INSERT INTO clients VALUES (10,'Белова Анна Александровна','+79151112200','4518223344','г. Москва, ул. Садовая, д.30')").run();

db.prepare("INSERT INTO cars VALUES (1,'JTNBE46KX7300001','Toyota','Camry',2023,3500000,'Белый','sold',1)").run();
db.prepare("INSERT INTO cars VALUES (2,'WBA3A5C50DF000002','BMW','X5',2024,7200000,'Черный','sold',2)").run();
db.prepare("INSERT INTO cars VALUES (3,'KNADM4A35E6000003','Kia','Rio',2022,1800000,'Красный','available',1)").run();
db.prepare("INSERT INTO cars VALUES (4,'XW8ZZZ61ZEG000004','Volkswagen','Tiguan',2023,3200000,'Серебристый','available',2)").run();
db.prepare("INSERT INTO cars VALUES (5,'Z94C41BBFGR000005','Hyundai','Tucson',2024,2900000,'Синий','available',1)").run();
db.prepare("INSERT INTO cars VALUES (6,'JTMBD33VX76000006','Toyota','RAV4',2024,4200000,'Черный','available',3)").run();
db.prepare("INSERT INTO cars VALUES (7,'WBA5A7C5XFG000007','BMW','X7',2024,11000000,'Белый','sold',2)").run();
db.prepare("INSERT INTO cars VALUES (8,'WVWZZZ3CZHE000008','Volkswagen','Passat',2023,3500000,'Серый','sold',4)").run();
db.prepare("INSERT INTO cars VALUES (9,'KMHD841EMJU000009','Hyundai','Sonata',2023,2800000,'Белый','available',3)").run();
db.prepare("INSERT INTO cars VALUES (10,'SALWA2EEXHA000010','Land Rover','Range Rover',2024,15000000,'Черный','available',5)").run();
db.prepare("INSERT INTO cars VALUES (11,'WAUZZZ4G9FN000011','Audi','A6',2023,5500000,'Синий','sold',3)").run();
db.prepare("INSERT INTO cars VALUES (12,'VF1RFE00X62000012','Renault','Duster',2022,2100000,'Оранжевый','available',4)").run();
db.prepare("INSERT INTO cars VALUES (13,'Z8N4B41DBG000013','Nissan','Qashqai',2024,3300000,'Зеленый','available',1)").run();
db.prepare("INSERT INTO cars VALUES (14,'XTA211030K0000014','Lada','Vesta',2024,1800000,'Белый','available',4)").run();
db.prepare("INSERT INTO cars VALUES (15,'YS3FB49YX41000015','Saab','9-3',2021,1500000,'Красный','available',5)").run();
db.prepare("INSERT INTO cars VALUES (16,'JN1TBNT32U0000016','Nissan','X-Trail',2024,3800000,'Серебристый','available',2)").run();
db.prepare("INSERT INTO cars VALUES (17,'WDD2040071F000017','Mercedes-Benz','C-Class',2023,4800000,'Черный','sold',5)").run();
db.prepare("INSERT INTO cars VALUES (18,'JM0KE107200000018','Mazda','CX-5',2023,3100000,'Красный','sold',3)").run();
db.prepare("INSERT INTO cars VALUES (19,'WBA3B3G5XDNS00019','BMW','3 Series',2024,5100000,'Белый','available',2)").run();
db.prepare("INSERT INTO cars VALUES (20,'JTJAM7BX0M3000020','Lexus','RX',2024,8900000,'Серый','available',5)").run();

db.prepare("INSERT INTO sales VALUES (1,1,1,1,'2026-04-15',3450000,'card','Скидка 50 тыс. за trade-in')").run();
db.prepare("INSERT INTO sales VALUES (2,2,2,2,'2026-04-10',7100000,'credit','Кредит Сбербанка на 5 лет')").run();
db.prepare("INSERT INTO sales VALUES (3,8,3,1,'2026-03-22',3450000,'cash','Оплата наличными')").run();
db.prepare("INSERT INTO sales VALUES (4,18,4,3,'2026-03-15',3050000,'card','')").run();
db.prepare("INSERT INTO sales VALUES (5,6,5,5,'2026-02-28',4180000,'credit','Кредит ВТБ на 3 года')").run();
db.prepare("INSERT INTO sales VALUES (6,7,6,2,'2026-02-10',10900000,'card','VIP-клиент')").run();
db.prepare("INSERT INTO sales VALUES (7,11,7,1,'2026-01-20',5400000,'cash','')").run();
db.prepare("INSERT INTO sales VALUES (8,17,8,3,'2026-01-08',4750000,'card','Корпоративный клиент')").run();

console.log('Готово!');
console.log('Машин:', db.prepare('SELECT COUNT(*) as c FROM cars').get().c);
console.log('Клиентов:', db.prepare('SELECT COUNT(*) as c FROM clients').get().c);
console.log('Сотрудников:', db.prepare('SELECT COUNT(*) as c FROM employees').get().c);
console.log('Сделок:', db.prepare('SELECT COUNT(*) as c FROM sales').get().c);

db.close();