const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// تنظیمات
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'farakod-secret-key-1403',
    resave: false,
    saveUninitialized: true
}));

// اتصال به دیتابیس
const db = new sqlite3.Database('company.db');

// ساخت جدول‌ها و ادمین پیش‌فرض
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT
    )`);
    
    // ادمین پیش‌فرض (فقط اگه نباشه ساخته میشه)
    db.get("SELECT * FROM admin WHERE username = 'admin'", (err, row) => {
        if (!row && !err) {
            bcrypt.hash('123456', 10, (err, hash) => {
                if (!err) db.run("INSERT INTO admin (username, password) VALUES ('admin', ?)", [hash]);
            });
        }
    });
});

// میدلور چک کردن لاگین ادمین
function isAuthenticated(req, res, next) {
    if (req.session.isAdmin) return next();
    res.redirect('/admin/login');
}

// روت‌های اصلی سایت
app.get('/', (req, res) => res.render('index', { title: 'فراکد | طراحی سایت و اپلیکیشن' }));
app.get('/about', (req, res) => res.render('about', { title: 'درباره ما' }));
app.get('/services', (req, res) => res.render('services', { title: 'خدمات' }));
app.get('/contact', (req, res) => res.render('contact', { title: 'تماس با ما' }));
app.get('/portfolio', (req, res) => res.render('portfolio', { title: 'نمونه کارها' }));

// فرم تماس
app.post('/contact', (req, res) => {
    const { name, email, phone, message } = req.body;
    db.run("INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)",
        [name, email, phone, message], (err) => {
            if (err) return res.send("خطا در ذخیره اطلاعات");
            res.send("<h3>پیام شما با موفقیت ارسال شد</h3><a href='/'>بازگشت به صفحه اصلی</a>");
        });
});

// پنل ادمین
app.get('/admin/login', (req, res) => res.render('admin_login', { title: 'ورود به پنل مدیریت' }));

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admin WHERE username = ?", [username], (err, row) => {
        if (!row) return res.send("کاربر وجود ندارد");
        bcrypt.compare(password, row.password, (err, result) => {
            if (!result) return res.send("رمز اشتباه است");
            req.session.isAdmin = true;
            res.redirect('/admin/dashboard');
        });
    });
});

app.get('/admin/dashboard', isAuthenticated, (req, res) => {
    db.all("SELECT * FROM messages ORDER BY created_at DESC", (err, rows) => {
        res.render('admin', { messages: rows });
    });
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// اجرای سرور
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});