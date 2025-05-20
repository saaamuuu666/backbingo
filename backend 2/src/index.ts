import express from "express";
import cors from 'cors';
const app = express();
app.use(cors());

import bodyParser from 'body-parser';
const jsonParser = bodyParser.json();

import * as db from './db-connection';

app.get('/players/:id', async (req, res) => {
    console.log(`Petición recibida al endpoint GET /user/:email.`);
    console.log(`Parámetro recibido por URL: ${req.params.email}`);

    try{
        let query = `SELECT * FROM users WHERE id='${req.params.email}'`;
        let db_response = await db.query(query);

        if(db_response.rows.length > 0){
            console.log(`Usuario encontrado: ${db_response.rows[0].id}`);
            res.json(db_response.rows[0]);   
        } else{
            console.log(`Usuario no encontrado.`)
            res.json(`User not found`);
        }

    } catch (err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

});

app.post('/user', jsonParser, async (req, res) => {

    console.log(`Petición recibida al endpoint POST /user. 
        Body: ${JSON.stringify(req.body)}`);

    try {
        
        let query = `INSERT INTO users 
        VALUES ('${req.body.id}', '${req.body.nombre}');`; 
        let db_response = await db.query(query);

        console.log(db_response);

        if(db_response.rowCount == 1){
            res.json(`El registro ha sido creado correctamente.`);
        } else{
            res.json(`El registro NO ha sido creado.`);
        }
    
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/products', async (req, res) => {
    console.log(`Petición recibida al endpoint GET /products`);
   

    try{
        let query = `SELECT * FROM products ORDER BY price ASC`;
        let db_response = await db.query(query);

        if(db_response.rows.length > 0){
            console.log(`Numero de productos encontrado: ${db_response.rows.length}`);
            res.json(db_response.rows);   
        } else{
            console.log(`Producto no encontrado.`)
            res.json(`User not found`);
        }

    } catch (err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

});

app.post('/products/buy', jsonParser, async (req, res) => {

    console.log(`Petición recibida al endpoint POST /products/buy. 
        Body: ${JSON.stringify(req.body)}`);

    try {



    let new_product = {
        id_user: req.body.id_user,
        id_product: req.body.id_product,
        is_paid: false,
        date_bought: new Date().toISOString().split('T'[0])
    }
      console.log(`Producto a añadir: ${JSON.stringify(new_product)}`);
    //  res.json('res json')
        let query = `INSERT INTO payments (id_user,id_product,is_paid,date_bought)
        VALUES ('${new_product.id_user}', ${new_product.id_product}, ${new_product.is_paid}, '${new_product.date_bought}');`; 
        let db_response = await db.query(query);


        if(db_response.rowCount == 1){
            console.log('Producto creado')
            res.json(`El producto ha sido creado correctamente.`);
        } else{
            res.json(`El producto NO ha sido creado.`);
        }
    
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
app.get('/payments/unpaid', async (req, res) => {
    console.log(`Petición recibida al endpoint GET /payments/unpaid`);
   

    try{
        let query = `SELECT * FROM payments WHERE is_paid = false ORDER BY date_bought DESC;`;
        let db_response = await db.query(query);

        if(db_response.rows.length > 0){
            console.log(`Productos no pagados: ${db_response.rows}`);
            res.json(db_response.rows);   
        } else{
            console.log(`Producto no encontrado.`)
            res.json(`User not found`);
        }

    } catch (err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

});
app.get('/payments/paid', async (req, res) => {
    console.log(`Petición recibida al endpoint GET /payments/paid`);
   
 
    try{
        let query = `SELECT * FROM payments WHERE is_paid = true ORDER BY date_paid DESC;`;
        let db_response = await db.query(query);

        if(db_response.rows.length > 0){
            console.log(`Productos no pagados: ${db_response.rows}`);
            res.json(db_response.rows);   
        } else{
            console.log(`Producto no encontrado.`)
            res.json(`User not found`);
        }

    } catch (err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

});
app.post('/products/pay', jsonParser, async (req, res) => {

    console.log(`Petición recibida al endpoint POST /products/buy. 
        Body: ${JSON.stringify(req.body)}`);

    try {

        let update_product = {
            id_user: req.body.id_user,
            id_product: req.body.id_product,
            is_paid: true,
            date_paid: new Date().toISOString().split('T'[0])
        }
    
    //  res.json('res json')
        let query = `UPDATE payments SET 
        is_paid =  '${update_product.is_paid}', date_paid = '${update_product.date_paid}' WHERE id = '${req.body.id}' AND id_user = '${req.body.id_user}';`;
            
        let db_response = await db.query(query);


        if(db_response.rowCount == 1){
            console.log('Producto actualizado')
            res.json(`El producto ha sido actualizado correctamente.`);
        } else{
            res.json(`El producto NO ha sido actualizado.`);
        }
    
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/alumno', jsonParser, async (req, res) => {

    console.log(`Petición recibida al endpoint POST /alumno. 
        Body: ${JSON.stringify(req.body)}`);

    try {



    let new_student = {
        id: req.body.id,
        name: req.body.name,
        surname: req.body.surname,
        age: req.body.age,
        grade: req.body.grade
    }
      console.log(`Alumno a añadir: ${JSON.stringify(new_student)}`);
    //  res.json('res json')





        let query = `INSERT INTO alumnos VALUES ('${new_student.id}', '${new_student.name}', '${new_student.surname}', ${new_student.age},'${new_student.grade}');`; 
        let db_response = await db.query(query);


        if(db_response.rowCount == 1){
            console.log('Alumno creado')
            res.json(`El Alumno ha sido creado correctamente.`);
        } else{
            res.json(`El Alumno No ha sido creado.`);
        }
    
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/alumnos', async (req, res) => {
    console.log(`Petición recibida al endpoint GET /alumnos`);
   
 
    try{
        let query = `SELECT * FROM alumnos;`;
        let db_response = await db.query(query);

        if(db_response.rows.length > 0){
            console.log(`Alumnos: ${db_response.rows}`);
            res.json(db_response.rows);   
        } else{
            console.log(`Alumno no encontrado.`)
            res.json(`User not found`);
        }

    } catch (err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

});
app.get('/alumno/delete/:id', async (req, res) => {
    console.log(`Petición recibida al endpoint GET /alumno/delete`);
    console.log(`Parámetro recibido por URL: ${req.params.id}`);

    try{
        let query = `DELETE FROM alumnos WHERE id='${req.params.id}'`;
        let db_response = await db.query(query);

        if(db_response.rowCount > 0){
            console.log(`Alumno ${req.params.id} eliminado: `);
            res.json("Alumno delete");   
        } else{
            console.log(`Alumno no eliminado.`)
            res.json(`User not found`);
        }

    } catch (err){
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

});



/*app.post('/perfil', jsonParser, async (req, res) => {
    console.log(`Petición recibida al endpoint POST /perfil. 
        Body:${JSON.stringify(req.body)}`);
    try {
        
        let query = `INSERT INTO alumnos (name, email, img) 
        VALUES ('${req.body.name}', '${req.body.email}', '${req.body.img}');`;
        console.log(query);
        let db_response = await db.query(query);
        console.log(db_response);
        
        res.json(`El registro del señor/a ${req.body.nombre} ${req.body.apellidos}, con domicilio ${req.body.direccion},
             y color de pelo ${req.body.color_pelo} ha sido creado.`);

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/suma/:valor1/:valor2', (req, res) => {
    let resultado: number = 0;
    resultado = Number(req.params.valor1) + Number(req.params.valor2);
    console.log("resultado: " + resultado);
    res.send(String(resultado));
});*/

/*app.post('/futbolistas', jsonParser, async (req, res) => {
    console.log(`Petición recibida al endpoint POST /futbolistas. 
        Body:${JSON.stringify(req.body)}`);
    try {
        let query = `INSERT INTO alumnos (name, email, img) 
        VALUES ('${req.body.name}', '${req.body.email}', '${req.body.img}');`;
        console.log(query);
        let db_response = await db.query(query);
        console.log(db_response);
        res.json("Registro guardado correctamente.");
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});*/

const port = process.env.PORT || 3000;

app.listen(port, () => 
    console.log(`App listening on PORT ${port}.

    ENDPOINTS:
    
     
     `));