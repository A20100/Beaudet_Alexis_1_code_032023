const jwt = require('jsonwebtoken');
const dotenv = require("dotenv").config();

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; //Nous extrayons le token du header Authorization de la requête entrante. Nous utilisons donc la fonction split pour tout récupérer après l'espace dans le header. 
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_TOKEN); //La méthode verify() du package jsonwebtoken permet de vérifier la validité d'un token.
        const userId = decodedToken.userId;
        req.auth = {
            userId: userId
        };
        next();
    } catch (error) {
        res.status(401).json({ error });
    }
};