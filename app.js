var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost:27017/NNPTUD-Buoi7');
mongoose.connection.on('connected', function () {
  console.log("da connect");
});

// Giả định Model (Thay thế bằng require thực tế của bạn nếu có)
// const Reservation = require('./models/Reservation'); 

// --- CÁC HÀM XỬ LÝ RESERVATIONS ---

// 1. Get all của user -> GET /reservations/
app.get('/reservations', async (req, res) => {
  try {
    // Lưu ý: Cần middleware lấy userId từ token/session, ở đây mình giả định req.query.userId
    const userId = req.query.userId; 
    const data = await mongoose.model('Reservation').find({ userId: userId });
    res.json(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// 2. Get 1 của user -> GET /reservations/:id
app.get('/reservations/:id', async (req, res) => {
  try {
    const data = await mongoose.model('Reservation').findById(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(404).send({ message: "Không tìm thấy" });
  }
});

// 3. reserveACart -> POST /reserveACart
app.post('/reserveACart', async (req, res) => {
  try {
    const newRes = await mongoose.model('Reservation').create({
      userId: req.body.userId,
      items: req.body.cartItems, // Lấy từ body hoặc query cart
      status: 'pending'
    });
    res.status(201).json(newRes);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// 4. reserveItems -> POST /reserveItems {body gồm list product và quantity}
app.post('/reserveItems', async (req, res) => {
  try {
    const { userId, items } = req.body; // items: [{productId, quantity}]
    const newRes = await mongoose.model('Reservation').create({
      userId,
      items,
      status: 'pending'
    });
    res.status(201).json(newRes);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// 5. cancelReserve -> POST /cancelReserve/:id (Dùng Transaction)
app.post('/cancelReserve/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const reservation = await mongoose.model('Reservation').findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { session, new: true }
    );

    if (!reservation) throw new Error("Không tìm thấy đơn đặt");

    // Logic hoàn kho nếu cần thiết thực hiện tại đây...
    
    await session.commitTransaction();
    res.send({ message: "Hủy thành công (Transaction committed)" });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).send({ message: "Lỗi khi hủy: " + err.message });
  } finally {
    session.endSession();
  }
});

// --- CÁC ROUTE CŨ ---
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/roles', require('./routes/roles'));
app.use('/auth', require('./routes/auth'));
app.use('/carts', require('./routes/carts'));
app.use('/products', require('./routes/products'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.send({ message: err.message });
});

module.exports = app;