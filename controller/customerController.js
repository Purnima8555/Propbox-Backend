const bcrypt = require('bcryptjs');
const Customer = require("../model/customer");
const Credential = require("../model/credential");
const nodemailer = require("nodemailer");


// FindAll function
const findAll = async (req,res) => {
    try {
        const customers = await Customer.find();
    res.status(200).json(customers);
    } catch (e) {
        res.json(e)
    }
}


// Save user function
const save = async (req, res) => {
  const { username, full_name, email, contact_no, address, role, password } = req.body;

  try {
    // Validate required fields
    if (!username || !password || !full_name || !email || !contact_no) {
      return res.status(400).json({ message: "All required fields (username, password, full_name, email, contact_no) must be provided" });
    }

    // Check if username already exists
    const existingUser = await Credential.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Check if an image file is provided
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new Credential document
    const cred = new Credential({
      username,
      password: hashedPassword,
      role: role || "User",
    });
    await cred.save();

    // Create the Customer document with the same _id
    const customer = new Customer({
      _id: cred._id,
      username,
      full_name,
      email,
      contact_no,
      role: role || "User",
      address,
      image: req.file.filename,
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

    // Send welcome email to the customer
    const info = await transporter.sendMail({
      from: "rpurnima8555@gmail.com",
      to: customer.email,
      subject: "Welcome to BOOKIT!",
      html: `
        <h1>Welcome, ${customer.full_name}!</h1>
        <p>Your account has been created successfully. Here are your details:</p>
        <ul>
          <li><strong>Username:</strong> ${customer.username}</li>
          <li><strong>Role:</strong> ${customer.role}</li>
          <li><strong>Contact No:</strong> ${customer.contact_no}</li>
        </ul>
        <p>Thank you for joining us!</p>
      `,
    });

    res.status(201).json({ message: "User saved successfully", customer, emailInfo: info });
  } catch (error) {
    console.error("Error saving customer:", error);
    res.status(500).json({ message: "Error saving customer", error: error.message });
  }
};


// Find By id function
const findById = async (req,res) => {
    try {
        const customers = await Customer.findById(req.params.id);
    res.status(200).json(customers);
    } catch (e) {
        res.json(e)
    }
}


// Delete user function
const deleteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from Customer collection
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Delete from Credential collection using the same _id
    const credential = await Credential.findByIdAndDelete(id);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found for this customer" });
    }

    res.status(200).json({ message: "User deleted from both Customer and Credential collections" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};


// Update info function
const update = async (req, res) => {
    try {
        const { role, image, ...otherUpdates } = req.body;

        // Find and update customer, ensuring role and image are handled properly
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            {
                ...otherUpdates,
                role: role || "User",
                image: image || null
            },
            { new: true }
        );

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        // Update the related credential document
        const cred = await Credential.findOneAndUpdate(
            { _id: customer._id },
            req.body,
            { new: true }
        );

        if (!cred) {
            return res.status(404).json({ message: "Credential not found for this customer" });
        }

        // Send email notification (unchanged)
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: "rpurnima8555@gmail.com",
                pass: "kwvuyzwguvdohwzu"
            }
        });

        const info = await transporter.sendMail({
            from: "rpurnima8555@gmail.com",
            to: customer.email,
            subject: "Your Account Details Have Been Updated",
            html: `
                <h1>Hello ${customer.full_name},</h1>
                <p>Your account details have been successfully updated. Here are your updated details:</p>
                <ul>
                    <li><strong>Full Name:</strong> ${customer.full_name}</li>
                    <li><strong>Username:</strong> ${customer.username}</li>
                    <li><strong>Email:</strong> ${customer.email}</li>
                    <li><strong>Contact Number:</strong> ${customer.contact_no}</li>
                    <li><strong>Address:</strong> ${customer.address}</li>
                    <li><strong>Role:</strong> ${customer.role}</li>
                </ul>
                <p>If you did not request these changes, please contact our support team immediately.</p>
            `
        });

        res.status(200).json({ message: "Customer details updated successfully", customer, cred, emailInfo: info });
    } catch (e) {
        console.error("Error updating customer:", e);
        res.status(500).json({ message: "Failed to update customer details", error: e });
    }
};


// Updated: Get and Update Customer with Image Upload
const getAndUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // If no updates provided, just return the customer data
    if (!updates && !req.file) {
      return res.status(200).json(customer);
    }

    // Validate and handle updates
    const { username, full_name, email, contact_no, address, role } = updates;

    // Check if username is being updated and already exists
    if (username && username !== customer.username) {
      const existingUser = await Credential.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    // Prepare update data
    const updateData = {
      username: username || customer.username,
      full_name: full_name || customer.full_name,
      email: email || customer.email,
      contact_no: contact_no || customer.contact_no,
      address: address || customer.address,
      role: role || customer.role,
      image: req.file ? req.file.filename : customer.image, // Use req.file.filename if a new image is uploaded
    };

    // Update Customer document
    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Update Credential document (only username if provided)
    if (username) {
      const updatedCred = await Credential.findOneAndUpdate(
        { _id: id },
        { username },
        { new: true }
      );
      if (!updatedCred) {
        return res.status(404).json({ message: "Credential not found for this customer" });
      }
    }

    // Send email notification if updates were made
    let info;
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "rpurnima8555@gmail.com",
          pass: "kwvuyzwguvdohwzu",
        },
      });

      info = await transporter.sendMail({
        from: "rpurnima8555@gmail.com",
        to: updatedCustomer.email,
        subject: "Your Account Details Have Been Updated",
        html: `
          <h1>Hello ${updatedCustomer.full_name},</h1>
          <p>Your account details have been successfully updated. Here are your updated details:</p>
          <ul>
            <li><strong>Full Name:</strong> ${updatedCustomer.full_name}</li>
            <li><strong>Username:</strong> ${updatedCustomer.username}</li>
            <li><strong>Email:</strong> ${updatedCustomer.email}</li>
            <li><strong>Contact Number:</strong> ${updatedCustomer.contact_no}</li>
            <li><strong>Address:</strong> ${updatedCustomer.address}</li>
            <li><strong>Role:</strong> ${updatedCustomer.role}</li>
            ${updatedCustomer.image ? `<li><strong>Profile Image:</strong> ${updatedCustomer.image}</li>` : ''}
          </ul>
          <p>If you did not request these changes, please contact our support team immediately.</p>
        `,
      });
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    console.log('Updated customer:', updatedCustomer);
    res.status(200).json({
      message: "Customer details retrieved and updated successfully",
      customer: updatedCustomer,
      emailInfo: info || { message: "Email sending failed but update succeeded" },
    });
  } catch (error) {
    console.error("Error in getAndUpdate customer:", error);
    res.status(500).json({ message: "Error in getAndUpdate customer", error: error.message });
  }
};


// New: Get total customer count
const getCustomerCount = async (req, res) => {
  try {
    const count = await Customer.countDocuments();
    console.log("Total customers in database:", count);
    res.status(200).json({ count });
  } catch (err) {
    console.error("Error fetching customer count:", err);
    res.status(500).json({ message: "Error fetching customer count", error: err.message || err });
  }
};

module.exports = {
  findAll,
  save,
  findById,
  deleteById,
  update,
  getAndUpdate,
  getCustomerCount,
};