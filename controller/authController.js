const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Credential = require("../model/credential");
const Customer = require("../model/customer");
const nodemailer = require("nodemailer");
const PasswordReset = require('../model/passwordReset');
const upload = require("../middleware/uploads");
const { createNotification } = require("./notificationController");

const SECRET_KEY = "21e6fb393716f568bf5ab155f62379812ac5b048efdea976aa1b1699f9e7e7dd";


// Register function
const register = async (req, res) => {
    const { username, password, confirmPassword, role, full_name, email, contact_no, address, image } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const existingUser = await Credential.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        // Generate a hashed password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new Credential document
        const cred = new Credential({ username, password: hashedPassword, role });
        await cred.save();

        // Create the Customer document with the same _id
        const customer = new Customer({
            _id: cred._id,
            username,
            full_name,
            email,
            contact_no,
            role,
            address,
            image,
        });

        await customer.save();

        // Set up nodemailer transporter for sending confirmation email
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: "rpurnima8555@gmail.com",
                pass: "kwvuyzwguvdohwzu",
            },
        });

        // Send email to the customer
        const info = await transporter.sendMail({
            from: "rpurnima8555@gmail.com",
            to: customer.email,
            subject: "Welcome to BOOKIT!",
            html: `
                <h1>Welcome, ${customer.full_name}!</h1>
                <p>Your registration is complete. Here are your details:</p>
                <ul>
                    <li><strong>Username:</strong> ${customer.username}</li>
                    <li><strong>Role:</strong> ${customer.role}</li>
                    <li><strong>Contact No:</strong> ${customer.contact_no}</li>
                </ul>
                <p>Thank you for joining us!</p>
            `,
        });

        res.status(201).json({ message: "User registered successfully", customer, emailInfo: info });
    } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).json({ message: "Registration failed", error });
    }
};


// login function
const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user in creds collection
        const cred = await Credential.findOne({ username });
        if (!cred || !(await bcrypt.compare(password, cred.password))) {
            return res.status(403).send("Invalid username or password");
        }

        // Retrieve user details from the Customer collection
        const customer = await Customer.findOne({ username });
        if (!customer) {
            return res.status(404).send("User details not found");
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: cred._id, username: cred.username, role: cred.role },
            SECRET_KEY,
            { expiresIn: '1d' }
        );

        // Create login notification
        const loginTime = new Date().toLocaleString();
        const notificationMessage = `You logged in successfully on ${loginTime}. If this wasn't you, please secure your account immediately.`;
        
        await createNotification(
            customer._id,
            null, // No booking ID for login notifications
            notificationMessage
        );

        // Include userId in the response
        res.json({
            token,
            username: cred.username,
            role: cred.role,
            userId: customer._id
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error });
    }
};

const asyncHandler = require("../middleware/async");


// Image Upload function
const uploadImage = asyncHandler(async (req, res) => {

    console.log("Request Body:", req.body);
    console.log("File:", req.file);

    if (!req.file) {
        console.log("No file uploaded or file not processed by multer");
        return res.status(400).json({ message: "No file uploaded or file format not supported" });
    }

    upload(req, res, (err) => {
        if (err) {
            console.log("Error during upload:", err.message);
            return res.status(400).json({ message: "Image upload failed", error: err.message });
        }

        if (!req.file) {
            console.log("No file uploaded");
            return res.status(400).json({ message: "Please upload a file" });
        }

        console.log("Uploaded file:", req.file);
        res.status(200).json({
            success: true,
            data: req.file.filename,
        });
    });
});


// Delete user function
const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const customer = await Customer.findByIdAndDelete(id);
        if (!customer) {
            return res.status(404).send("Customer not found");
        }

        // Find and delete from creds collection based on username
        const cred = await Credential.findOneAndDelete({ username: customer.username });
        if (!cred) {
            return res.status(404).send("Credential not found for the given customer");
        }

        res.status(200).json({ message: "User deleted from both collections" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete user", error });
    }
};


// Forgot Password function
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Find the user by email
        const user = await Customer.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User with this email does not exist." });
        }

        // Generate a 6-digit random code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiry time (e.g., 15 minutes from now)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Check if an entry already exists and update it, otherwise create a new one
        let resetEntry = await PasswordReset.findOne({ userId: user._id });
        if (resetEntry) {
            resetEntry.code = resetCode;
            resetEntry.expiresAt = expiresAt;
            await resetEntry.save();
        } else {
            resetEntry = new PasswordReset({
                userId: user._id,
                email: user.email,
                code: resetCode,
                expiresAt: expiresAt
            });
            await resetEntry.save();
        }

        // Send the reset code via email
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: "rpurnima8555@gmail.com",
                pass: "kwvuyzwguvdohwzu"
            }
        });

        await transporter.sendMail({
            from: "rpurnima8555@gmail.com",
            to: email,
            subject: "Password Reset Verification Code",
            html: `
                <h1>Password Reset Verification</h1>
                <p>Use the following code to reset your password:</p>
                <h2>${resetCode}</h2>
                <p>This code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
            `
        });

        res.status(200).json({ message: "Password reset code has been sent to your email." });
    } catch (error) {
        console.error("Error in forgotPassword:", error);
        res.status(500).json({ message: "An error occurred.", error });
    }
};


// Reset Password function
const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        // Find the reset entry using the email and code
        const resetEntry = await PasswordReset.findOne({ email, code });

        if (!resetEntry) {
            return res.status(400).json({ message: "Invalid or expired verification code." });
        }

        // Check if the code has expired
        const isCodeExpired = resetEntry.expiresAt < Date.now();
        if (isCodeExpired) {
            return res.status(400).json({ message: "Verification code has expired." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the Credential collection
        await Credential.findByIdAndUpdate(resetEntry.userId, { password: hashedPassword });

        // Delete the reset entry to prevent reuse of the code
        await PasswordReset.findByIdAndDelete(resetEntry._id);

        // Send confirmation email to the user
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "rpurnima8555@gmail.com",
                pass: "kwvuyzwguvdohwzu"
            }
        });

        await transporter.sendMail({
            from: "rpurnima8555@gmail.com",
            to: email,
            subject: "Password Successfully Updated",
            html: `
                <h1>Password Updated</h1>
                <p>Your password has been successfully updated. If you did not perform this action, please contact our support team immediately.</p>
            `
        });

        res.status(200).json({ message: "Password updated successfully and email notification sent." });
    } catch (err) {
        console.error("Error resetting password:", err);
        res.status(500).json({ message: "Error resetting password", error: err });
    }
};


// Verify code function
const verifyCode = async (req, res) => {
    const { email, code } = req.body;

    try {
        // Find verification code in the database
        const resetEntry = await PasswordReset.findOne({ email, code });

        if (!resetEntry) {
            return res.status(400).json({ message: "Invalid or expired verification code." });
        }

        // Check if the code has expired
        const isCodeExpired = resetEntry.expiresAt < Date.now();
        if (isCodeExpired) {
            return res.status(400).json({ message: "Verification code has expired." });
        }

        res.status(200).json({ message: "Code verified successfully. You can now reset your password." });
    } catch (error) {
        console.error("Error in verifyCode:", error);
        res.status(500).json({ message: "An error occurred.", error });
    }
};


// Check if username or email exists
const checkUserExists = async (req, res) => {
    const { username, email } = req.body;

    try {
        // Validate input: at least one field must be provided
        if (!username && !email) {
            return res.status(400).json({ message: "Please provide a username or email to check." });
        }

        // Check for existing username and email in Credential collection
        const existingUsername = username ? await Credential.findOne({ username }) : null;
        const existingEmail = email ? await Customer.findOne({ email }) : null;

        // Prepare response
        const response = {
            usernameExists: !!existingUsername,
            emailExists: !!existingEmail,
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error checking user existence:", error);
        res.status(500).json({ message: "Error checking user existence", error: error.message });
    }
};

module.exports = { register, login, deleteUser, forgotPassword, resetPassword, verifyCode, uploadImage, checkUserExists };