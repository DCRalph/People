const express = require('express')
const app = express()
const port = 4114

const lowDB = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const db = lowDB(new FileSync('db.json'))
db.defaults({ people: [], admins: [] })
    .write()

const { nanoid } = require("nanoid")

const { ejs, name } = require('ejs')

const cookieParser = require('cookie-parser')


app.use(cookieParser())

app.set("view engine", "ejs")

app.set("views", __dirname + "/public")

app.use(express.urlencoded({ extended: false }))

app.use(express.json())


var tokens = []
var tokenLookup = []

function getPerson(input) {
    return db.get('people').find({ "names": [input] }).value()
}

function login(username, password) {
    let user = db.get('admins').find({ "username": username }).value()

    let msg = {
        type: 'Login',
        username,
        token: '',
        status: null,
        msg: '',
        date: Date()
    }

    if (typeof user === 'undefined') {
        msg.status = false
        msg.msg = 'Incorrect username.'
        return msg
    }

    if (user.password === password) {

        if (tokenLookup[user.username]) {
            delete tokens[tokenLookup[user.username]]
            delete tokenLookup[user.username]
        }

        tokenLookup[user.username] = nanoid(64)
        tokens[tokenLookup[user.username]] = user.username

        msg.status = true
        msg.token = tokenLookup[user.username]
        msg.msg = 'Successfully logged in.'
        return msg;
    } else {
        msg.status = false
        msg.msg = 'Incorrect password.'
        return msg;
    }
}

function logout(username) {
    if (tokenLookup[username]) {
        delete tokens[tokenLookup[username]]
        delete tokenLookup[username]
    }
    return username + ' Successfully logged out.'
}

function validateUser(token) {
    if (tokens[token]) {
        let user = db.get('admins').find({ "username": tokens[token] }).value()
        return user
    } else return false
}

app.get('/', (req, res) => {
    res.render("index")
})

app.get('/p/:person', (req, res) => {

    let person = req.params.person.toLowerCase()

    if(typeof person != 'undefined'){
        return res.render("index", {person})
    }

    res.render("index")
})

app.post('/person', (req, res) => {

    let name = req.body.person.toLowerCase()

    // if (name == 'admin') return res.redirect('admin')

    let person = getPerson(name)

    let text = {}

    if (name == '' || name == 'help' || name == 'info' || typeof person == 'undefined') {
        text = {
            exists: true,
            title: 'How to use',
            body: 'Enter a name and the algorithm will calculate their worth to society.'
        }
    } else {
        text = {
            exists: true,
            title: person.name,
            body: person.value
        }
    }

    res.status(200).send(text)
})

app.get('/admin', (req, res) => {
    if (user = validateUser(req.cookies['Token'])) {
        let people = db.get('people').value()
        return res.render("admin", { people })
    }
    res.render("admin-login")
})

app.post('/admin-login', (req, res) => {
    console.log(req.body);
    let username = req.body.username
    let password = req.body.password
    let l = login(username, password)

    if (l.status == true) {
        return res.cookie('Token', l.token, { maxAge: 60000 * 60 * 24 * 365 }).redirect('/admin')
    } else {
        return res.render("admin-login", { msg: { text: l.msg, type: 'danger' } })
    }
})

app.post('/admin-edit', (req, res) => {
    if (user = validateUser(req.cookies['Token'])) {

        // console.log(req.body);
        // console.log('*******');
        // console.log(db.get('people').value());

        db.set('people', req.body)
            .write()

        return res.status(200).send({ type: 'success', message: 'Successful worked' })
    }
    res.render("admin-login", { msg: { text: 'what are u doing step bro', type: 'danger' } })
})

app.get("/logout", (req, res) => {
    delete tokenLookup[tokens[req.cookies['Token']]]
    delete tokens[req.cookies['Token']]
    res.clearCookie("Token")
    res.redirect('/admin')
});

var server = app.listen(port, () => {
    console.log('server is running on port', server.address().port);
})