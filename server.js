if(process.env.NODE_ENV != 'production'){
    require('dotenv').config()
}

const express = require('express')
const passport = require('passport')
const session = require('express-session')
const flash = require('express-flash')
const mysql = require('mysql')
const bcrypt = require('bcrypt')
const methodOverride = require('method-override')
const localStratergy = require('passport-local').Strategy


const app = express()

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Delta_21',    
    database: 'slam'
})

db.connect((error)=>{
    if(error) throw error
    console.log("Database connected")
})


app.use(express.json())
app.set('view-engine', 'ejs')
app.use(express.urlencoded({extended: true}))
app.use(flash())

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}))

app.use(passport.initialize(
    passport, email => rows[0].find(user => user.email === email),
    id => rows[0].find(user => user.id === id)
))
app.use(passport.session())

passport.use(new localStratergy({
    usernameField: 'email',
    passwordField: 'password'
},(email, password, done)=>{
    db.query("SELECT * FROM profiles where email = '" + email + "'", (error, rows)=>{
        if(error) throw error
        bcrypt.compare(password, rows[0].password, (error, result)=>{
            if(error) throw error
            if(!(result == true)){
                return done(null, false, {message: "Incorrect Credentials"})
            }
            return done(null, rows[0])
        })
    } )

}))

passport.serializeUser((user, done)=>{
    done(null, user.roll_no)
})
passport.deserializeUser((id, done)=>{
    return done(null, id)
})

app.use(methodOverride('_method'))

function checkAuthenticated(req, res, next){
    let sql = 'SELECT sNo FROM profiles WHERE roll_no = ? '
    db.query(sql, [req.user], (error, rows)=>{
        if(error) throw error
        if(!(req.params.index == rows[0].sNo)){
            res.redirect('/login')            
        }
    })
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

function userAuthenticated(req, res, next){
    let sql = 'SELECT sNo FROM profiles WHERE roll_no = ? '
    db.query(sql, [req.user], (error, rows)=>{
        if(error) throw error
        if(req.params.index == rows[0].sNo){
            if(req.isAuthenticated()){
                res.redirect(`/user/${req.params.index}`)
            }
        }
        else{
            return next()
        }
    })    
}

app.get('/', (req, res)=>{
    res.render('index.ejs')
})

app.get('/register', (req, res) =>{
    res.render('register.ejs')
})

app.post('/register', async (req, res) =>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        let sql = 'INSERT INTO profiles (roll_no, Email, name, password) VALUES?'
        var values = [[`${req.body.rollno}`, `${req.body.email}`, `${req.body.name}`, `${hashedPassword}`]]
        db.query(sql, [values], (error)=>{
            if(error) throw error
            
        })
        res.redirect('/login')
    }
    catch{
        res.redirect('/register')
    }

})

app.get('/login', (req, res) =>{
    res.render('login.ejs')
    
})

app.post('/login', passport.authenticate('local',
    {failureRedirect: '/login', failureFlash: true}), (req, res)=>{
        res.redirect(`/user/${req.user.sNo}`)
    }    
)

app.delete('/logout', (req, res)=>{
    req.logOut((error)=>{
        if(error) throw error 
    })
    res.redirect('/login')
})

app.get('/profile/:index', userAuthenticated, (req, res)=>{
    let sql = 'SELECT * FROM profiles WHERE sNo = ?'
    db.query(sql, [req.params.index], (error, rows)=>{
        if(error) throw error
        res.render('profile.ejs', {data: rows[0]})
    })
})

app.post('/profile/:index', (req, res)=>{
    if(req.body.type == 'none'){
        let sql = 'SELECT sNo from profiles where name = ?'
        db.query(sql, [req.body.name], (error, rows)=>{
            try {
                res.redirect(`/profile/${rows[0].sNo}`)
                
            } catch (error) {
                res.redirect(`/profile/${req.params.index}`)
            }                                
        })
    }
    else{
        let sql = `SELECT * from profiles where name = '` + req.body.name + `' and ${req.body.type} = ?`
        db.query(sql, [req.body.value], (error, rows)=>{
            try {
                res.redirect(`/profile/${rows[0].sNo}`)
                
            } catch (error) {
                res.redirect(`/profile/${req.params.index}`)
            }                                
            
        }) 
    }
})


app.get('/user/:index', checkAuthenticated, (req, res)=>{
    let sql = 'SELECT * FROM profiles WHERE sNo = ?'
    db.query(sql, [req.params.index], (error, rows)=>{
        if(error) throw error
        res.render('user.ejs', {data: rows[0]})
    })
})

app.post('/user/:index',  checkAuthenticated, (req, res)=>{
    let sql = 'SELECT sNo from profiles where name = ?'
    db.query(sql, [req.body.name], (error, rows)=>{
        try {
            res.redirect(`/profile/${rows[0].sNo}`)
            
        } catch (error) {
            res.redirect(`/profile/${req.params.index}`)
        }                                
    })
})

app.get('/user/:index/edit', (req, res)=>{
    let sql = 'SELECT * FROM profiles WHERE sNo = ?'
    db.query(sql, [req.params.index], (error, rows)=>{
        if(error) throw error
        res.render('edit.ejs', {edit: rows[0], id: req.params.index})
    })
})

app.post('/user/:index/edit', (req, res)=>{
    let sql = `UPDATE profiles SET ? WHERE sNo = ?`
    var id = req.params.index
    db.query(sql, [req.body, id], (error)=>{
        if(error) throw error
        res.redirect(`/user/${id}`)
    })
})

app.listen(3000)