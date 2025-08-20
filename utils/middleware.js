const logger = require('./logger');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const getTokenFrom = (req) => {    
    const authorization = req.get('authorization');    
    

    if(authorization && authorization.startsWith('Bearer ')){
        
        return authorization.replace('Bearer ', '');
    }
    return null;
}

const tokenExtractor = (req, res, next) => {    
    req.token = getTokenFrom(req);    
    next();
}


const userExtractor = async (req, res, next) => {
    const decodedToken = jwt.verify(req.token, process.env.SECRET);  
    if(!decodedToken.id){
        return res.status(401).json({error: 'token invalid'});
    }  
    
    req.user = await User.findById(decodedToken.id);
    
    next();
}

const requestLogger = (req, res, next) => {
    logger.info('Method:', req.method);
    logger.info('Path:', req.path);
    logger.info('Body:', req.body);
    logger.info('---');
    next();
}

const unknownEndpoint = (req, res) => {
    res.status(400).send({error: 'unknown endpoint'});
}

const errorHandler = (error, req, res, next) => {
    logger.error(error.message);

    if(error.name === 'CastError'){
        return res.status(400).send({error: 'malformatted id'});
    }else if(error.name === 'ValidationError'){
        return res.status(400).json({error: error.message});
    }else if(error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')){
        return res.status(400).json({error: 'expected `username` to be unique'})
    }else if(error.name === 'JsonWebTokenError'){
        return res.status(401).json({error: 'token invalid'});
    }

    next(error);
}

module.exports = {
    tokenExtractor,
    userExtractor,
    requestLogger,
    unknownEndpoint,
    errorHandler
}