const User = require("../models/user")
const { check, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')


exports.signup = (req, res) => {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: errors.array()[0].msg
        })
    }

    const user = new User(req.body)
    // save() renvoie 1er parametre: err et en 2eme parametre: user enregistré 
    user.save((err, user) => {
        if (err) {
            return res.status(400).json({
                err: "Not able to save user in DB"
            })
        }
        res.json({
            name: user.name,
            email: user.email,
            id: user._id
        })
    })
}

exports.signin = (req, res) => {
    const errors = validationResult(req)
    const { email, password } = req.body

    if (!errors.isEmpty()) {
        return res.status(422).json({
            error: errors.array()[0].msg
        })
    }

    User.findOne({ email }, (err, user) => {
        if (err || !user) {
            return res.status(400).json({
                error: "USER email does not exists"
            })
        }

        if (!user.authenticate(password)) {
            return res.status(401).json({
                error: "Email and password do not match"
            })
        }

        // Je créé un token a partir d'une ligne clé: valeur d'un objet user + un string
        const token = jwt.sign({ _id: user._id }, process.env.SECRET)
        // Je met le token dans le cookie
        res.cookie("token", token, { expire: new Date() + 9999 })
        // envoyer response au frontend
        const { _id, name, email, role } = user
        return res.json({ token, user: { _id, name, email, role } })
    })

}

exports.signout = (req, res) => {
    res.clearCookie("token")
    res.json({
        message: "User signout successfully"
    })
}

// protected routes
exports.isSignedIn = expressJwt({
    secret: process.env.SECRET,
    userProperty: "auth"  //ajoute du contenu notamment l'id du user connecté dans req (provenant du front)
})

// custom middleware
exports.isAuthenticated = (req, res, next) => {
    let checker = req.profile && req.auth && req.profile._id == req.auth._id
    if (!checker) {
        return res.status(403).json({
            error: "ACCESS DENIED"
        })
    }
    next()
}

exports.isAdmin = (req, res, next) => {
    if (req.profile.role === 0) {
        return res.status(403).json({
            error: "You are not ADMIN, Access denied"
        })
    }
    next()
}