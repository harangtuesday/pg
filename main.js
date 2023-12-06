const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const port = 2400;
app.use(express.json());
app.use(express.static('public'));

const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

const db = {
  host: 'svc.sel5.cloudtype.app',
  user: 'root',
  password: '1234',
  database: 'web',
  port: '31527',
};

app.use(express.static(path.join(__dirname, 'public')));

passport.use(new LocalStrategy(async (username, password, done) => {
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (!user) {
            return done(null, false, {
                message: 'Incorrect username.'
            });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return done(null, false, {
                message: 'Incorrect password.'
            });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    } finally {
        await connection.end();
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [id]);
        const user = rows[0];

        done(null, user);
    } catch (err) {
        done(err);
    } finally {
        await connection.end();
    }
});

app.use(express.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('table', {
        user: req.user
    });
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.send(`
      <script type="text/javascript">
        alert("로그인이 필요합니다.");
        window.location.href = "/login";
      </script>
    `);
    }
}

app.get('/send-points', isAuthenticated, (req, res) => {
    res.render('send-points', {
        user: req.user
    });
});

app.post('/send-points', isAuthenticated, async (req, res) => {
    const senderId = req.user.id;
    const {
        recipient,
        points
    } = req.body;

    const connection = await mysql.createConnection(db);

    try {
        const [recipientRows] = await connection.execute('SELECT id, point FROM users WHERE username = ?', [recipient]);
        const recipientUser = recipientRows[0];

        if (!recipientUser) {
            return res.status(400).send('Recipient not found.');
        }

        if (senderId === recipientUser.id) {
            return res.status(400).send('You cannot send points to yourself.');
        }

        const [senderRows] = await connection.execute('SELECT point FROM users WHERE id = ?', [senderId]);
        const senderPoint = senderRows[0].point;

        if (senderPoint < points || points < 0) {
            return res.status(400).send('Invalid points value.');
        }

        const newSenderPoint = senderPoint - parseInt(points);
        await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newSenderPoint, senderId]);

        const newRecipientPoint = parseInt(recipientUser.point) + parseInt(points);
        await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newRecipientPoint, recipientUser.id]);

        io.emit('update-rank');
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while sending points.');
    } finally {
        await connection.end();
    }
});

app.get('/user-point', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT point FROM users WHERE id = ?', [userId]);
        const userPoint = rows[0].point;

        res.json({
            point: userPoint
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'An error occurred while fetching the user point.'
        });
    } finally {
        await connection.end();
    }
});


app.get('/table', isAuthenticated, (req, res) => {
    res.render('table', {
        user: req.user
    });
});

app.get('/rank', async (req, res) => {
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT username, point FROM users ORDER BY point DESC');
        res.json({
            users: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'An error occurred while fetching the rank.'
        });
    } finally {
        await connection.end();
    }
});

app.get('/rank-list', async (req, res) => {
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT username, point FROM users ORDER BY point DESC');

        res.render('rank', {
            users: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching the rank.');
    } finally {
        await connection.end();
    }
});


app.get('/mine', isAuthenticated, (req, res) => {
    res.render('mine', {
        user: req.user
    });
});

app.post('/increase-point', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT point FROM users WHERE id = ?', [userId]);
        const currentPoint = rows[0].point;

        const newPoint = currentPoint + 1;

        await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newPoint, userId]);

        res.json({
            point: newPoint
        });
        io.emit('update-rank');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while increasing the point.');
    } finally {
        await connection.end();
    }

});
app.post('/increase-point-100', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const connection = await mysql.createConnection(db);

  try {
      const [rows] = await connection.execute('SELECT point FROM users WHERE id = ?', [userId]);
      const currentPoint = rows[0].point;

      const random = Math.floor(Math.random() * 100) + 1;

      let newPoint = currentPoint;
      if (currentPoint >= 1000) {
          if (random <= 20) {
              newPoint = currentPoint - 1000;
          } else {
              newPoint = currentPoint + 100;
          }

          await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newPoint, userId]);
      }
      else {
        if (random <= 20) {
            newPoint = 0;
        } else {
            newPoint = currentPoint + 100;
        }

        await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newPoint, userId]);
      }

      res.json({
          point: newPoint
      });
      io.emit('update-rank');
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while increasing the point.');
  } finally {
      await connection.end();
  }
});


app.post('/increase-point-2x', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT point FROM users WHERE id = ?', [userId]);
        const currentPoint = rows[0].point;

        const random = Math.floor(Math.random() * 100) + 1;

        let newPoint;
        if (random <= 50) {
            newPoint = Math.round(currentPoint * 0.3333333333);
        } else {
            newPoint = currentPoint * 2;
        }

        await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newPoint, userId]);

        res.json({
            point: newPoint
        });
        io.emit('update-rank');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while increasing the point.');
    } finally {
        await connection.end();
    }
});
app.post('/increase-point-10x', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT point FROM users WHERE id = ?', [userId]);
        const currentPoint = rows[0].point;

        const random = Math.floor(Math.random() * 100) + 1;

        let newPoint;
        if (random <= 90) {
            newPoint = Math.round(currentPoint * 0.5);
        } else {
            newPoint = currentPoint * 10;
        }

        await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newPoint, userId]);

        res.json({
            point: newPoint
        });
        io.emit('update-rank');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while increasing the point.');
    } finally {
        await connection.end();
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const {
        username,
        password
    } = req.body;
    const connection = await mysql.createConnection(db);

    try {
        const [existingUsers] = await connection.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (existingUsers.length > 0) {
            await connection.end();
            return res.send(`
        <script type="text/javascript">
          alert("이름이 이미 존재합니다.");
          window.location.href = "/register";
        </script>
      `);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await connection.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        await connection.end();
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        await connection.end();
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login'
    })
);

app.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

app.get('/edit-profile', isAuthenticated, (req, res) => {
    res.render('edit-profile', {
        user: req.user
    });
});

app.post('/edit-profile/username', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const newUsername = req.body.username;

    const connection = await mysql.createConnection(db);

    try {
        await connection.execute('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('이름 업데이트 중 오류가 발생했습니다.');
    } finally {
        await connection.end();
    }
});

app.post('/edit-profile/password', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(400).send('현재 비밀번호가 틀림');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('비밀번호 업데이트 중 오류가 발생했습니다.');
    } finally {
        await connection.end();
    }
});

app.get('/edit-profile', isAuthenticated, (req, res) => {
    res.render('edit-profile', {
        user: req.user
    });
});

app.post('/edit-profile', isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const newUsername = req.body.username;

    const connection = await mysql.createConnection(db);

    try {
        await connection.execute('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);

        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const updatedUser = rows[0];

        req.login(updatedUser, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('An error occurred while updating the profile.');
            } else {
                res.redirect('/');
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the profile.');
    } finally {
        await connection.end();
    }
});

app.get('/admin', isAdmin, async (req, res) => {
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT * FROM users');
        const users = rows;
        res.render('admin', {
            users: users
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    } finally {
        await connection.end();
    }
});

app.get('/admin/edit/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    const connection = await mysql.createConnection(db);

    try {
        const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [userId]);
        const user = rows[0];
        res.render('edit-user', {
            user: user
        });
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    } finally {
        await connection.end();
    }
});

app.post('/admin/update/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    const {
        username,
        point,
        isAdmin
    } = req.body;

    const connection = await mysql.createConnection(db);

    try {
        await connection.execute('UPDATE users SET username = ?, point = ? WHERE id = ?', [username, point, userId]);
        console.log(`User ${userId} updated successfully`);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.redirect(`/admin/edit/${userId}`);
    } finally {
        await connection.end();
    }
});

app.get('/admin/delete/:id', isAdmin, async (req, res) => {
    const userId = req.params.id;
    const connection = await mysql.createConnection(db);

    try {
        await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.redirect('/admin');
    } finally {
        await connection.end();
    }
});

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.isAdmin) {
        return next();
    } else {
        res.redirect('/');
    }
}

app.post('/bet', async (req, res) => {
    // 클라이언트에서 전송한 데이터를 받아옵니다.
    const { color, number, bet, money } = req.body;
    const userId = req.user.id;
    
    const connection = await mysql.createConnection(db);
  
    try {
      const [rows] = await connection.execute('SELECT point FROM users WHERE id = ?', [userId]);
      const currentPoint = rows[0].point;
        
        const bet = req.body.bet;
        const color = req.body.color;
        const num = req.body.num;
        const money = req.body.money;
        let newPoint = currentPoint;

        if (bet === 'b' || bet === 'r') {
            if (color === bet) {
                newPoint = currentPoint + Number(money);
            } else {
                newPoint = currentPoint - Number(money);
            }
        } else if (!isNaN(bet)) {  // bet이 숫자인 경우 num과 비교
            if (num === Number(bet)) {
                newPoint = currentPoint + (Number(money) * 36);
            } else {
                newPoint = currentPoint - Number(money);
            }
        }

        // bet이 공백으로 구분된 여러 개의 숫자인 경우
        // const betNumbers = bet.split(' ');
        // if (betNumbers.includes(num)) {
        // // 일치하는 경우 처리 로직
        // } else {
        // // 불일치하는 경우 처리 로직
        // }

  
      await connection.execute('UPDATE users SET point = ? WHERE id = ?', [newPoint, userId]);
  
      res.json({
        point: newPoint
      });
      io.emit('update-rank');
    } catch (error) {
      console.error(error);
      res.status(500).send('포인트를 증가시키는 동안 오류가 발생했습니다.');
    } finally {
      await connection.end();
    }
  });
  

var randomVar1 = 10
var randomVar2 = 10

io.on('connection', (socket) => {
    // 사용자가 페이지에 접속했을 때 실행되는 부분
    io.emit('randomVars', { var1: randomVar1, var2: randomVar2 });
  });
  

setInterval(() => {
    randomVar1 = Math.random();
    randomVar2 = Math.random();
  
    io.emit('randomVars', { var1: randomVar1, var2: randomVar2 });
  }, 60000);

httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
});
