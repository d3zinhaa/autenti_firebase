const express = require('express');
const { initializeApp } = require ("firebase/app");
const { getAuth,signInWithEmailAndPassword } = require("firebase/auth");
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
// Importe a função initializeApp corretamente

const firebaseConfig = {
    apiKey: "AIzaSyB3IOH1T1mI3k97pacCU4uJGWYDdWDz9qk",
    authDomain: "curriculo-api-27c24.firebaseapp.com",
    databaseURL: "https://curriculo-api-27c24-default-rtdb.firebaseio.com",
    projectId: "curriculo-api-27c24",
    storageBucket: "curriculo-api-27c24.appspot.com",
    messagingSenderId: "697642178925",
    appId: "1:697642178925:web:38d93c40dad077056e6264",
    measurementId: "G-SPHYWVPE5V"
};

// Initialize Firebase Authentication
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://curriculo-api-27c24-default-rtdb.firebaseio.com"
});


const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
      info: 'API de autenticação com Node.js, Express e Firebase',
    });
  });


const SECRET = "AIzaSyB3IOH1T1mI3k97pacCU4uJGWYDdWDz9qk";
// Rota para criar um novo usuário
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password
      });
      res.status(201).send(userRecord);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
   
  // Rota para fazer login e obter um token JWT
  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const auth = getAuth(firebaseApp);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
   
      const token = jwt.sign({ uid: user.uid }, process.env.FIREBASE_API_KEY, {
        expiresIn: '2h' // O token expira em 2 horas
      });
   
      res.status(200).json({
        statusCode: 200,
        message: 'Login realizado com sucesso!',
        data: {
          token,
        },
      });
    } catch (error) {
      res.status(401).json({
        statusCode: 401,
        message: 'Não autorizado! Usuário não encontrado ou senha incorreta.',
      });
    }
  });
   
  // Middleware para verificar o token JWT
  const verificarToken = (req, res, next) => {
    const tokenHeader = req.headers['authorization'];
    const token = tokenHeader && tokenHeader.split(' ')[1];
   
    if (!token) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Não autorizado! Token não fornecido.',
      });
    }
   
    try {
      const decodedToken = jwt.verify(token, process.env.FIREBASE_API_KEY);
      req.uid = decodedToken.uid;
      next();
    } catch (error) {
      console.error('Erro ao verificar o token:', error);
      res.status(401).json({
        statusCode: 401,
        message: 'Não autorizado! Token inválido.',
      });
    }
  };
   
  const checkIfAdmin = async (req, res, next) => {
    const { uid } = req.authId;
    if (!uid) {
      return res.status(400).send({ message: 'ID de usuário não fornecido.' });
    }
   
    try {
      const user = await admin.auth().getUser(uid);
      if (user.customClaims && user.customClaims.admin === true) {
        next();
      } else {
        // Se o usuário não tem a claim de admin, envie uma mensagem específica.
        res.status(403).send({ message: 'Acesso negado. Você precisa de privilégios de administrador para acessar este recurso.' });
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Se o usuário não for encontrado no Firebase Auth.
        res.status(404).send({ message: 'Usuário não encontrado.' });
      } else {
        // Para outros tipos de erros, envie uma mensagem de erro genérica.
        res.status(500).send({ message: 'Erro ao verificar privilégios de administrador.', error: error.message });
      }
    }
  };
   
   
  app.get('/admin', verificarToken, checkIfAdmin, (req, res) => {
    // Apenas administradores podem acessar esta rota
    res.status(200).json({
      statusCode: 200,
      message: 'Você acessou a rota protegida para administradores.',
    });
  });
   
   
  // Rota para listar todos os currículos
  app.get('/admin/curriculos',verificarToken, async (req, res) => {
    try {
      const response = await axios.get('https://api-rest-curriculo.vercel.app/curriculos');
      res.json(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
   
  // Rota para obter um currículo por nome
  app.get('/curriculos/pessoa/:nome',verificarToken, async (req, res) => {
    try {
      const { nome } = req.params;
      const response = await axios.get(`https://api-rest-curriculo.vercel.app/curriculos/pessoa/${nome}`);
      res.json(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
   
  // Rota para criar um currículo
  app.post('/curriculos',verificarToken,async (req, res) => {
    try {
      const response = await axios.post('https://api-rest-curriculo.vercel.app/curriculos', req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
   
  // Rota para atualizar um currículo por ID
  app.put('/curriculos/:id',verificarToken,async (req, res) => {
    try {
      const { id } = req.params;
      const response = await axios.put(`https://api-rest-curriculo.vercel.app/curriculos/${id}`, req.body);
      res.json(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
   
  // Rota para excluir um currículo por ID
  app.delete('/curriculos/:id',verificarToken, async (req, res) => {
    try {
      const { id } = req.params;
      const response = await axios.delete(`https://api-rest-curriculo.vercel.app/curriculos/${id}`);
      res.json(response.data);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
  // Servidor na porta 3000
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`);
  });
  