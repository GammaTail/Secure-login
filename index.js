import bodyParser from "body-parser";
import express from "express";
import pg from "pg";
import bcrypt from "bcrypt"
import nodemailer from "nodemailer";
import session from "express-session";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;
const saltRounds = 10;

function generateOTP(length) {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
}

app.use(session({
    secret: 'XXXXX', 
    resave: false,
    saveUninitialized: true
}));

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "XXXX",
    password: "XXXXX",
    port: 5432,
});

db.connect();

async function maile(email, randomOTP) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "yyyyyy",
                pass: "XXXXXX"
            }
        });

        const info = await transporter.sendMail({
            from: "xxxxxx",
            to: email,
            subject: "Your OTP for verification",
            text: `Your OTP is: ${randomOTP}`,
        });

        console.log("Email sent successfully:", info);
    } catch (err) {
        console.error("Error sending email:", err);
        throw err;
    }
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("choose");
})

app.get("/register", (req,res) => {
    res.render("register");
})

app.get("/login", (req,res) => {
    res.render("login");
})

app.get('/confirm', (req, res) => {
    res.render("otp")
});

app.get('/upload', (req, res) => {
    res.render("upload")
})

app.post("/register", async (req,res) => {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const mobileNumber = req.body.phoneNo;
    const randomOTP = generateOTP(6).trim();
    req.session.email = email;
    req.session.password = password;
    req.session.otp = randomOTP;
    req.session.name = name;
    req.body.mobileNumber = mobileNumber;

    try{
        const checkResult = await db.query("SELECT * FROM dummys WHERE email = $1", [email])
        if (checkResult.rows.length > 0){
            res.send("Email already registered try logging");
        } else {
            maile(email, randomOTP);
            res.render("otp")
        }
    } catch (err) {
        console.log(err);
    }
})

app.post("/confirm", async (req, res) => {
    const OTP = req.body.otpe;
    const email = req.session.email;
    const name = req.session.name;
    const phoneNumber = req.session.mobileNumber;
    const storedPassword = req.session.password;
    const storedOTP = req.session.otp
    
    if (storedOTP == `${OTP}`){
        bcrypt.hash(storedPassword, saltRounds, async(err, hash) => {
            if (err){
                console.log(err);
            } else {
                const Result = await db.query("INSERT INTO dummys (name, email, password, phone) VALUES ($1, $2, $3, $4)", [name, email, hash, phoneNumber]);
                res.render("who");
            }
        })
    } else {
        console.log("Wrong OTP");
    }
})

app.post("/login", async (req,res) => {
    const email = req.body.email;
    const password = req.body.password;

    try{
        const lResult = await db.query("SELECT * FROM dummys WHERE email = $1", [email]);
        
        if (lResult.rows.length > 0) {
            const user = lResult.rows[0];
             const hashedPassword = user.password;

             bcrypt.compare(password, hashedPassword, (err, result) => {
                if (err) {
                    console.log("Error in comparing password.", err);
                } else {
                    if (result) {
                        res.render("who");
                    } else {
                        res.send("Password is incorrect.")
                    }
                }
             })
        } else {
            res.send("User not found or is not registered.");
        }
    } catch (err) {
        console.log(err);
    }
})

app.post("/resend-otp", async (req, res) => {
    const email = req.session.email;
    const randomOTP = generateOTP(6).trim();
    req.session.otp = randomOTP;

    try {
        await maile(email, randomOTP);
        res.send("OTP has been resent. Check your email.");
    } catch (err) {
        console.error("Error resending OTP:", err);
        res.status(500).send("Failed to resend OTP. Please try again later.");
    }
});

app.listen(port, () => {
    console.log(`Server listening at port ${port}.`);
});