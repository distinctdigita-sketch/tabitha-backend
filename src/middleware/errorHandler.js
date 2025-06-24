const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return { message, statusCode: 400 };
  };
  
  const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return { message, statusCode: 400 };
  };
  
  const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return { message, statusCode: 400 };
  };
  
  const handleJWTError = () => ({
    message: 'Invalid token. Please log in again!',
    statusCode: 401
  });
  
  const handleJWTExpiredError = () => ({
    message: 'Your token has expired! Please log in again.',
    statusCode: 401
  });
  
  const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  };
  
  const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming or other unknown error: don't leak error details
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  };
  
  module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
  
    if (process.env.NODE_ENV === 'development') {
      sendErrorDev(err, res);
    } else {
      let error = { ...err };
      error.message = err.message;
  
      if (error.name === 'CastError') {
        const handledError = handleCastErrorDB(error);
        error.message = handledError.message;
        error.statusCode = handledError.statusCode;
        error.isOperational = true;
      }
  
      if (error.code === 11000) {
        const handledError = handleDuplicateFieldsDB(error);
        error.message = handledError.message;
        error.statusCode = handledError.statusCode;
        error.isOperational = true;
      }
  
      if (error.name === 'ValidationError') {
        const handledError = handleValidationErrorDB(error);
        error.message = handledError.message;
        error.statusCode = handledError.statusCode;
        error.isOperational = true;
      }
  
      if (error.name === 'JsonWebTokenError') {
        const handledError = handleJWTError();
        error.message = handledError.message;
        error.statusCode = handledError.statusCode;
        error.isOperational = true;
      }
  
      if (error.name === 'TokenExpiredError') {
        const handledError = handleJWTExpiredError();
        error.message = handledError.message;
        error.statusCode = handledError.statusCode;
        error.isOperational = true;
      }
  
      sendErrorProd(error, res);
    }
  };