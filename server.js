// ============================================================
// UDAN CAB - COMPLETE BACKEND SERVER
// Cab Booking + Driver + Admin + Parcel Delivery
// ============================================================

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ============================================================
// APP SETUP
// ============================================================

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    }
});

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// ============================================================
// CONFIG
// ============================================================

const PORT = process.env.PORT || 5000;

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb://127.0.0.1:27017/udan_cab";

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "UDAN_CAB_SECRET_CHANGE_THIS";

// ============================================================
// MONGODB CONNECTION
// ============================================================

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error.message);
    });

// ============================================================
// USER SCHEMA
// ============================================================

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        email: {
            type: String,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["passenger", "driver", "admin"],
            default: "passenger"
        },

        vehicleType: {
            type: String,
            default: ""
        },

        vehicleNumber: {
            type: String,
            default: ""
        },

        online: {
            type: Boolean,
            default: false
        },

        approved: {
            type: Boolean,
            default: false
        },

        blocked: {
            type: Boolean,
            default: false
        },

        rating: {
            type: Number,
            default: 5
        },

        location: {
            latitude: {
                type: Number,
                default: null
            },

            longitude: {
                type: Number,
                default: null
            }
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

// ============================================================
// RIDE SCHEMA
// ============================================================

const rideSchema = new mongoose.Schema(
    {
        passenger: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        pickup: {
            type: String,
            required: true
        },

        destination: {
            type: String,
            required: true
        },

        pickupLatitude: {
            type: Number,
            default: null
        },

        pickupLongitude: {
            type: Number,
            default: null
        },

        destinationLatitude: {
            type: Number,
            default: null
        },

        destinationLongitude: {
            type: Number,
            default: null
        },

        cabType: {
            type: String,
            default: "Mini Car"
        },

        vehicleType: {
            type: String,
            default: ""
        },

        fare: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: [
                "requested",
                "accepted",
                "started",
                "completed",
                "cancelled"
            ],
            default: "requested"
        },

        passengerLocation: {
            latitude: {
                type: Number,
                default: null
            },

            longitude: {
                type: Number,
                default: null
            }
        },

        driverLocation: {
            latitude: {
                type: Number,
                default: null
            },

            longitude: {
                type: Number,
                default: null
            }
        },

        cancelledBy: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

const Ride = mongoose.model("Ride", rideSchema);

// ============================================================
// PARCEL SCHEMA
// ============================================================

const parcelSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        senderName: {
            type: String,
            required: true,
            trim: true
        },

        senderPhone: {
            type: String,
            required: true,
            trim: true
        },

        receiverName: {
            type: String,
            required: true,
            trim: true
        },

        receiverPhone: {
            type: String,
            required: true,
            trim: true
        },

        pickup: {
            type: String,
            required: true,
            trim: true
        },

        destination: {
            type: String,
            required: true,
            trim: true
        },

        parcelType: {
            type: String,
            default: "Document"
        },

        weight: {
            type: Number,
            default: 0
        },

        description: {
            type: String,
            default: ""
        },

        fare: {
            type: Number,
            default: 0
        },

        status: {
            type: String,

            enum: [
                "pending",
                "accepted",
                "picked",
                "delivered",
                "cancelled"
            ],

            default: "pending"
        },

        pickupLatitude: {
            type: Number,
            default: null
        },

        pickupLongitude: {
            type: Number,
            default: null
        },

        destinationLatitude: {
            type: Number,
            default: null
        },

        destinationLongitude: {
            type: Number,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Parcel = mongoose.model("Parcel", parcelSchema);

// ============================================================
// AUTHENTICATION FUNCTIONS
// ============================================================

function createToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            role: user.role
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}


async function authenticate(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization || "";

        if (!authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                message: "Authentication required"
            });

        }

        const token =
            authHeader.substring(7);

        const decoded =
            jwt.verify(token, JWT_SECRET);

        const user =
            await User.findById(decoded.id);

        if (!user) {

            return res.status(401).json({
                message: "User not found"
            });

        }

        if (user.blocked) {

            return res.status(403).json({
                message: "Your account is blocked"
            });

        }

        req.user = user;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }
}


// ============================================================
// ROLE MIDDLEWARE
// ============================================================

function requireRole(...roles) {

    return (req, res, next) => {

        if (!req.user) {

            return res.status(401).json({
                message: "Authentication required"
            });

        }

        if (!roles.includes(req.user.role)) {

            return res.status(403).json({
                message: "Access denied"
            });

        }

        next();

    };

}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {

    res.json({
        success: true,
        message: "UDAN CAB server is running",
        time: new Date()
    });

});


// ============================================================
// AUTH - REGISTER
// ============================================================

app.post("/api/auth/register", async (req, res) => {

    try {

        const {
            name,
            phone,
            email,
            password,
            role,
            vehicleType,
            vehicleNumber
        } = req.body;

        if (!name || !phone || !password) {

            return res.status(400).json({
                message:
                    "Name, phone and password are required"
            });

        }

        const existingUser =
            await User.findOne({
                phone
            });

        if (existingUser) {

            return res.status(400).json({
                message:
                    "Phone number already registered"
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        let userRole =
            role === "driver"
                ? "driver"
                : "passenger";

        const user =
            new User({

                name,

                phone,

                email,

                password: hashedPassword,

                role: userRole,

                vehicleType:
                    userRole === "driver"
                        ? vehicleType || ""
                        : "",

                vehicleNumber:
                    userRole === "driver"
                        ? vehicleNumber || ""
                        : "",

                approved:
                    userRole === "driver"
                        ? false
                        : true

            });

        await user.save();

        const token =
            createToken(user);

        res.status(201).json({

            message:
                userRole === "driver"
                    ? "Driver registration successful. Wait for admin approval."
                    : "Registration successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                approved: user.approved
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });

    }

});


// ============================================================
// AUTH - LOGIN
// ============================================================

app.post("/api/auth/login", async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body;

        if (!phone || !password) {

            return res.status(400).json({
                message:
                    "Phone and password are required"
            });

        }

        const user =
            await User.findOne({
                phone
            });

        if (!user) {

            return res.status(401).json({
                message:
                    "Invalid phone or password"
            });

        }

        if (user.blocked) {

            return res.status(403).json({
                message:
                    "Your account has been blocked"
            });

        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                message:
                    "Invalid phone or password"
            });

        }

        const token =
            createToken(user);

        res.json({

            message: "Login successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                role: user.role,
                approved: user.approved,
                online: user.online
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Login failed",
            error: error.message
        });

    }

});


// ============================================================
// GET CURRENT USER
// ============================================================

app.get(
    "/api/me",
    authenticate,
    async (req, res) => {

        res.json({
            user: req.user
        });

    }
);


// ============================================================
// CREATE CAB RIDE
// ============================================================

app.post(
    "/api/rides",
    authenticate,
    requireRole("passenger"),
    async (req, res) => {

        try {

            const {
                pickup,
                destination,
                cabType,
                vehicleType,
                fare,
                pickupLatitude,
                pickupLongitude,
                destinationLatitude,
                destinationLongitude
            } = req.body;

            if (!pickup || !destination) {

                return res.status(400).json({
                    message:
                        "Pickup and destination are required"
                });

            }

            const ride =
                new Ride({

                    passenger:
                        req.user._id,

                    pickup,

                    destination,

                    cabType:
                        cabType || "Mini Car",

                    vehicleType:
                        vehicleType || "",

                    fare:
                        Number(fare) || 0,

                    pickupLatitude:
                        pickupLatitude ?? null,

                    pickupLongitude:
                        pickupLongitude ?? null,

                    destinationLatitude:
                        destinationLatitude ?? null,

                    destinationLongitude:
                        destinationLongitude ?? null

                });

            await ride.save();

            await ride.populate(
                "passenger",
                "name phone email"
            );

            io.emit(
                "newRide",
                ride
            );

            res.status(201).json({

                message:
                    "Ride request created",

                ride

            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message:
                    "Unable to create ride",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// GET MY RIDES
// ============================================================

app.get(
    "/api/rides",
    authenticate,
    async (req, res) => {

        try {

            let query = {};

            if (req.user.role === "passenger") {

                query.passenger =
                    req.user._id;

            }

            if (req.user.role === "driver") {

                query.driver =
                    req.user._id;

            }

            const rides =
                await Ride.find(query)
                    .populate(
                        "passenger",
                        "name phone email"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    )
                    .sort({
                        createdAt: -1
                    });

            res.json({
                rides
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to load rides",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// GET SINGLE RIDE
// ============================================================

app.get(
    "/api/rides/:id",
    authenticate,
    async (req, res) => {

        try {

            const ride =
                await Ride.findById(
                    req.params.id
                )
                    .populate(
                        "passenger",
                        "name phone email"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    );

            if (!ride) {

                return res.status(404).json({
                    message: "Ride not found"
                });

            }

            res.json({
                ride
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to load ride",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DRIVER - GET AVAILABLE RIDES
// ============================================================

app.get(
    "/api/driver/rides",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            if (!req.user.approved) {

                return res.json({
                    rides: [],
                    message:
                        "Driver is waiting for admin approval"
                });

            }

            const rides =
                await Ride.find({
                    status: "requested",
                    driver: null
                })
                    .populate(
                        "passenger",
                        "name phone"
                    )
                    .sort({
                        createdAt: -1
                    });

            res.json({
                rides
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to load available rides",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DRIVER - ACCEPT RIDE
// ============================================================

app.post(
    "/api/rides/:id/accept",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const driver =
                await User.findById(
                    req.user._id
                );

            if (!driver.approved) {

                return res.status(403).json({
                    message:
                        "Driver is not approved by admin"
                });

            }

            if (!driver.online) {

                return res.status(400).json({
                    message:
                        "Please go online first"
                });

            }

            const ride =
                await Ride.findOneAndUpdate(
                    {
                        _id: req.params.id,
                        status: "requested",
                        driver: null
                    },
                    {
                        driver: req.user._id,
                        status: "accepted"
                    },
                    {
                        new: true
                    }
                )
                    .populate(
                        "passenger",
                        "name phone"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    );

            if (!ride) {

                return res.status(400).json({
                    message:
                        "Ride is no longer available"
                });

            }

            io.emit(
                "rideAccepted",
                ride
            );

            res.json({

                message:
                    "Ride accepted successfully",

                ride

            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to accept ride",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DRIVER - START RIDE
// ============================================================

app.post(
    "/api/rides/:id/start",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const ride =
                await Ride.findOneAndUpdate(
                    {
                        _id: req.params.id,
                        driver: req.user._id,
                        status: "accepted"
                    },
                    {
                        status: "started"
                    },
                    {
                        new: true
                    }
                );

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found or cannot be started"
                });

            }

            io.emit(
                "rideStarted",
                ride
            );

            res.json({
                message:
                    "Ride started",
                ride
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to start ride",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DRIVER - COMPLETE RIDE
// ============================================================

app.post(
    "/api/rides/:id/complete",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const ride =
                await Ride.findOneAndUpdate(
                    {
                        _id: req.params.id,
                        driver: req.user._id,
                        status: "started"
                    },
                    {
                        status: "completed"
                    },
                    {
                        new: true
                    }
                );

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found or cannot be completed"
                });

            }

            io.emit(
                "rideCompleted",
                ride
            );

            res.json({
                message:
                    "Ride completed",
                ride
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to complete ride",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// CANCEL RIDE
// ============================================================

app.post(
    "/api/rides/:id/cancel",
    authenticate,
    async (req, res) => {

        try {

            const ride =
                await Ride.findById(
                    req.params.id
                );

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found"
                });

            }

            const isPassenger =
                ride.passenger &&
                ride.passenger.toString() ===
                req.user._id.toString();

            const isDriver =
                ride.driver &&
                ride.driver.toString() ===
                req.user._id.toString();

            if (!isPassenger && !isDriver) {

                return res.status(403).json({
                    message:
                        "You cannot cancel this ride"
                });

            }

            if (
                ride.status === "completed" ||
                ride.status === "cancelled"
            ) {

                return res.status(400).json({
                    message:
                        "Ride cannot be cancelled"
                });

            }

            ride.status = "cancelled";

            ride.cancelledBy =
                req.user.role;

            await ride.save();

            io.emit(
                "rideCancelled",
                ride
            );

            res.json({

                message:
                    "Ride cancelled",

                ride

            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to cancel ride",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// RIDE STATUS
// ============================================================

app.get(
    "/api/rides/:id/status",
    authenticate,
    async (req, res) => {

        try {

            const ride =
                await Ride.findById(
                    req.params.id
                )
                    .populate(
                        "passenger",
                        "name phone"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    );

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found"
                });

            }

            res.json({
                status: ride.status,
                ride
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to get ride status",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DRIVER ONLINE / OFFLINE
// ============================================================

app.post(
    "/api/driver/status",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const online =
                Boolean(req.body.online);

            req.user.online =
                online;

            await req.user.save();

            res.json({

                message:
                    online
                        ? "Driver is online"
                        : "Driver is offline",

                online:
                    req.user.online

            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to update driver status",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DRIVER LOCATION UPDATE
// ============================================================

app.post(
    "/api/location/update",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const {
                latitude,
                longitude
            } = req.body;

            if (
                latitude === undefined ||
                longitude === undefined
            ) {

                return res.status(400).json({
                    message:
                        "Latitude and longitude required"
                });

            }

            req.user.location = {
                latitude:
                    Number(latitude),
                longitude:
                    Number(longitude)
            };

            await req.user.save();

            io.emit(
                "driverLocation",
                {
                    driverId:
                        req.user._id,
                    latitude:
                        Number(latitude),
                    longitude:
                        Number(longitude)
                }
            );

            res.json({
                message:
                    "Location updated",
                location:
                    req.user.location
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to update location",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// UPDATE DRIVER LOCATION FOR RIDE
// ============================================================

app.post(
    "/api/rides/:id/driver-location",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const {
                latitude,
                longitude
            } = req.body;

            const ride =
                await Ride.findOne({
                    _id: req.params.id,
                    driver: req.user._id
                });

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found"
                });

            }

            ride.driverLocation = {
                latitude:
                    Number(latitude),
                longitude:
                    Number(longitude)
            };

            await ride.save();

            io.to(
                `ride_${ride._id}`
            ).emit(
                "driverLocationUpdate",
                {
                    rideId:
                        ride._id,
                    latitude:
                        Number(latitude),
                    longitude:
                        Number(longitude)
                }
            );

            res.json({
                message:
                    "Driver ride location updated",
                location:
                    ride.driverLocation
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to update ride location",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// UPDATE PASSENGER LOCATION FOR RIDE
// ============================================================

app.post(
    "/api/rides/:id/passenger-location",
    authenticate,
    requireRole("passenger"),
    async (req, res) => {

        try {

            const {
                latitude,
                longitude
            } = req.body;

            const ride =
                await Ride.findOne({
                    _id: req.params.id,
                    passenger: req.user._id
                });

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found"
                });

            }

            ride.passengerLocation = {
                latitude:
                    Number(latitude),
                longitude:
                    Number(longitude)
            };

            await ride.save();

            io.to(
                `ride_${ride._id}`
            ).emit(
                "passengerLocationUpdate",
                {
                    rideId:
                        ride._id,
                    latitude:
                        Number(latitude),
                    longitude:
                        Number(longitude)
                }
            );

            res.json({
                message:
                    "Passenger location updated",
                location:
                    ride.passengerLocation
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to update passenger location",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// GET RIDE LOCATION
// ============================================================

app.get(
    "/api/rides/:id/location",
    authenticate,
    async (req, res) => {

        try {

            const ride =
                await Ride.findById(
                    req.params.id
                );

            if (!ride) {

                return res.status(404).json({
                    message:
                        "Ride not found"
                });

            }

            res.json({

                driverLocation:
                    ride.driverLocation,

                passengerLocation:
                    ride.passengerLocation

            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to get location",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// NEARBY DRIVERS
// ============================================================

app.get(
    "/api/drivers/nearby",
    authenticate,
    async (req, res) => {

        try {

            const latitude =
                Number(req.query.latitude);

            const longitude =
                Number(req.query.longitude);

            const radius =
                Number(req.query.radius || 10);

            if (
                Number.isNaN(latitude) ||
                Number.isNaN(longitude)
            ) {

                return res.status(400).json({
                    message:
                        "Latitude and longitude required"
                });

            }

            const drivers =
                await User.find({
                    role: "driver",
                    online: true,
                    approved: true,
                    blocked: false
                })
                    .select(
                        "name phone vehicleType vehicleNumber rating location"
                    );

            const nearby =
                drivers.filter(driver => {

                    if (
                        !driver.location ||
                        driver.location.latitude === null ||
                        driver.location.longitude === null
                    ) {

                        return false;

                    }

                    const distance =
                        calculateDistance(
                            latitude,
                            longitude,
                            driver.location.latitude,
                            driver.location.longitude
                        );

                    return distance <= radius;

                });

            res.json({
                drivers: nearby
            });

        } catch (error) {

            res.status(500).json({
                message:
                    "Unable to find nearby drivers",
                error:
                    error.message
            });

        }

    }
);


// ============================================================
// DISTANCE CALCULATION
// ============================================================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI /
        180;

    const dLon =
        (lon2 - lon1) *
        Math.PI /
        180;

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(
            lat1 * Math.PI / 180
        ) *

        Math.cos(
            lat2 * Math.PI / 180
        ) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;

}


// ============================================================
// ============================================================
// PARCEL DELIVERY APIs
// ============================================================
// ============================================================


// ============================================================
// CREATE PARCEL
// ============================================================

app.post(
    "/api/parcels",
    authenticate,
    requireRole("passenger"),
    async (req, res) => {

        try {

            const {
                senderName,
                senderPhone,
                receiverName,
                receiverPhone,
                pickup,
                destination,
                parcelType,
                weight,
                description,
                fare,
                pickupLatitude,
                pickupLongitude,
                destinationLatitude,
                destinationLongitude
            } = req.body;


            if (
                !senderName ||
                !senderPhone ||
                !receiverName ||
                !receiverPhone ||
                !pickup ||
                !destination
            ) {

                return res.status(400).json({

                    message:
                        "Sender, receiver, pickup and destination details are required"

                });

            }


            // Basic parcel fare calculation

            let calculatedFare = 50;

            const parcelWeight =
                Number(weight) || 0;


            if (parcelWeight > 1) {

                calculatedFare +=
                    (parcelWeight - 1) * 20;

            }


            if (
                parcelType ===
                "Medium Package"
            ) {

                calculatedFare += 30;

            }


            if (
                parcelType ===
                "Large Package"
            ) {

                calculatedFare += 60;

            }


            if (
                Number(fare) > 0
            ) {

                calculatedFare =
                    Number(fare);

            }


            const parcel =
                new Parcel({

                    customer:
                        req.user._id,

                    senderName,

                    senderPhone,

                    receiverName,

                    receiverPhone,

                    pickup,

                    destination,

                    parcelType:
                        parcelType ||
                        "Document",

                    weight:
                        parcelWeight,

                    description:
                        description || "",

                    fare:
                        calculatedFare,

                    pickupLatitude:
                        pickupLatitude ??
                        null,

                    pickupLongitude:
                        pickupLongitude ??
                        null,

                    destinationLatitude:
                        destinationLatitude ??
                        null,

                    destinationLongitude:
                        destinationLongitude ??
                        null,

                    status:
                        "pending"

                });


            await parcel.save();


            await parcel.populate(
                "customer",
                "name phone email"
            );


            io.emit(
                "newParcel",
                parcel
            );


            res.status(201).json({

                message:
                    "Parcel request created successfully",

                parcel

            });

        } catch (error) {

            console.error(
                "Create parcel error:",
                error
            );

            res.status(500).json({

                message:
                    "Unable to create parcel request",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// GET MY PARCELS
// ============================================================

app.get(
    "/api/parcels/my",
    authenticate,
    requireRole("passenger"),
    async (req, res) => {

        try {

            const parcels =
                await Parcel.find({
                    customer:
                        req.user._id
                })
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber rating"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({

                parcels

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load parcel requests",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// GET SINGLE PARCEL
// ============================================================

app.get(
    "/api/parcels/:id",
    authenticate,
    async (req, res) => {

        try {

            const parcel =
                await Parcel.findById(
                    req.params.id
                )
                    .populate(
                        "customer",
                        "name phone email"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber rating"
                    );


            if (!parcel) {

                return res.status(404).json({

                    message:
                        "Parcel not found"

                });

            }


            const isOwner =
                parcel.customer &&
                parcel.customer._id.toString() ===
                req.user._id.toString();


            const isDriver =
                parcel.driver &&
                parcel.driver._id.toString() ===
                req.user._id.toString();


            if (
                req.user.role !== "admin" &&
                !isOwner &&
                !isDriver
            ) {

                return res.status(403).json({

                    message:
                        "Access denied"

                });

            }


            res.json({

                parcel

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load parcel",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// DRIVER - GET AVAILABLE PARCELS
// ============================================================

app.get(
    "/api/driver/parcels",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            if (!req.user.approved) {

                return res.json({

                    parcels: [],

                    message:
                        "Driver is waiting for admin approval"

                });

            }


            const parcels =
                await Parcel.find({

                    status:
                        "pending",

                    driver:
                        null

                })
                    .populate(
                        "customer",
                        "name phone"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({

                parcels

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load available parcels",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// DRIVER - ACCEPT PARCEL
// ============================================================

app.post(
    "/api/parcels/:id/accept",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            if (!req.user.approved) {

                return res.status(403).json({

                    message:
                        "Driver is not approved by admin"

                });

            }


            if (!req.user.online) {

                return res.status(400).json({

                    message:
                        "Please go online first"

                });

            }


            const parcel =
                await Parcel.findOneAndUpdate(

                    {
                        _id:
                            req.params.id,

                        status:
                            "pending",

                        driver:
                            null
                    },

                    {
                        driver:
                            req.user._id,

                        status:
                            "accepted"
                    },

                    {
                        new:
                            true
                    }

                )
                    .populate(
                        "customer",
                        "name phone"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    );


            if (!parcel) {

                return res.status(400).json({

                    message:
                        "Parcel is no longer available"

                });

            }


            io.emit(
                "parcelAccepted",
                parcel
            );


            res.json({

                message:
                    "Parcel accepted successfully",

                parcel

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to accept parcel",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// DRIVER - MARK PARCEL PICKED
// ============================================================

app.post(
    "/api/parcels/:id/picked",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const parcel =
                await Parcel.findOneAndUpdate(

                    {
                        _id:
                            req.params.id,

                        driver:
                            req.user._id,

                        status:
                            "accepted"
                    },

                    {
                        status:
                            "picked"
                    },

                    {
                        new:
                            true
                    }

                );


            if (!parcel) {

                return res.status(404).json({

                    message:
                        "Parcel not found or cannot be marked picked"

                });

            }


            io.emit(
                "parcelPicked",
                parcel
            );


            res.json({

                message:
                    "Parcel picked successfully",

                parcel

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to update parcel",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// DRIVER - DELIVER PARCEL
// ============================================================

app.post(
    "/api/parcels/:id/deliver",
    authenticate,
    requireRole("driver"),
    async (req, res) => {

        try {

            const parcel =
                await Parcel.findOneAndUpdate(

                    {
                        _id:
                            req.params.id,

                        driver:
                            req.user._id,

                        status:
                            "picked"
                    },

                    {
                        status:
                            "delivered"
                    },

                    {
                        new:
                            true
                    }

                );


            if (!parcel) {

                return res.status(404).json({

                    message:
                        "Parcel not found or cannot be delivered"

                });

            }


            io.emit(
                "parcelDelivered",
                parcel
            );


            res.json({

                message:
                    "Parcel delivered successfully",

                parcel

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to deliver parcel",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// CANCEL PARCEL
// ============================================================

app.post(
    "/api/parcels/:id/cancel",
    authenticate,
    async (req, res) => {

        try {

            const parcel =
                await Parcel.findById(
                    req.params.id
                );


            if (!parcel) {

                return res.status(404).json({

                    message:
                        "Parcel not found"

                });

            }


            const isCustomer =
                parcel.customer.toString() ===
                req.user._id.toString();


            const isDriver =
                parcel.driver &&
                parcel.driver.toString() ===
                req.user._id.toString();


            if (
                !isCustomer &&
                !isDriver &&
                req.user.role !== "admin"
            ) {

                return res.status(403).json({

                    message:
                        "You cannot cancel this parcel"

                });

            }


            if (
                parcel.status === "delivered" ||
                parcel.status === "cancelled"
            ) {

                return res.status(400).json({

                    message:
                        "Parcel cannot be cancelled"

                });

            }


            parcel.status =
                "cancelled";


            await parcel.save();


            io.emit(
                "parcelCancelled",
                parcel
            );


            res.json({

                message:
                    "Parcel cancelled",

                parcel

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to cancel parcel",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - GET DRIVERS
// ============================================================

app.get(
    "/api/admin/drivers",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const drivers =
                await User.find({
                    role: "driver"
                })
                    .select(
                        "-password"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({
                drivers
            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load drivers",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - GET PASSENGERS
// ============================================================

app.get(
    "/api/admin/passengers",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const passengers =
                await User.find({
                    role: "passenger"
                })
                    .select(
                        "-password"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({
                passengers
            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load passengers",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - GET ALL RIDES
// ============================================================

app.get(
    "/api/admin/rides",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const rides =
                await Ride.find({})
                    .populate(
                        "passenger",
                        "name phone email"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({
                rides
            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load rides",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - GET ALL PARCELS
// ============================================================

app.get(
    "/api/admin/parcels",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const parcels =
                await Parcel.find({})
                    .populate(
                        "customer",
                        "name phone email"
                    )
                    .populate(
                        "driver",
                        "name phone vehicleType vehicleNumber"
                    )
                    .sort({
                        createdAt: -1
                    });


            res.json({

                parcels

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load parcels",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - BLOCK / UNBLOCK USER
// ============================================================

app.post(
    "/api/admin/users/:id/block",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.params.id
                );


            if (!user) {

                return res.status(404).json({

                    message:
                        "User not found"

                });

            }


            user.blocked =
                Boolean(req.body.blocked);


            if (user.blocked) {

                user.online =
                    false;

            }


            await user.save();


            res.json({

                message:
                    user.blocked
                        ? "User blocked"
                        : "User unblocked",

                user

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to update user",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - BLOCK / UNBLOCK DRIVER
// ============================================================

app.post(
    "/api/admin/drivers/:id/block",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const driver =
                await User.findOne({
                    _id:
                        req.params.id,
                    role:
                        "driver"
                });


            if (!driver) {

                return res.status(404).json({

                    message:
                        "Driver not found"

                });

            }


            driver.blocked =
                Boolean(req.body.blocked);


            if (driver.blocked) {

                driver.online =
                    false;

            }


            await driver.save();


            res.json({

                message:
                    driver.blocked
                        ? "Driver blocked"
                        : "Driver unblocked",

                driver

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to update driver",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - APPROVE / REMOVE DRIVER APPROVAL
// ============================================================

app.post(
    "/api/admin/drivers/:id/approve",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const driver =
                await User.findOne({
                    _id:
                        req.params.id,
                    role:
                        "driver"
                });


            if (!driver) {

                return res.status(404).json({

                    message:
                        "Driver not found"

                });

            }


            driver.approved =
                Boolean(req.body.approved);


            await driver.save();


            res.json({

                message:
                    driver.approved
                        ? "Driver approved"
                        : "Driver approval removed",

                driver

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to update driver approval",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - UPDATE USER
// ============================================================

app.put(
    "/api/admin/users/:id",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const allowedFields = [
                "name",
                "phone",
                "email",
                "vehicleType",
                "vehicleNumber",
                "approved",
                "blocked",
                "online",
                "rating"
            ];


            const update = {};


            for (
                const field of allowedFields
            ) {

                if (
                    req.body[field] !==
                    undefined
                ) {

                    update[field] =
                        req.body[field];

                }

            }


            const user =
                await User.findByIdAndUpdate(

                    req.params.id,

                    update,

                    {
                        new: true
                    }

                ).select(
                    "-password"
                );


            if (!user) {

                return res.status(404).json({

                    message:
                        "User not found"

                });

            }


            res.json({

                message:
                    "User updated",

                user

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to update user",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - UPDATE PARCEL STATUS
// ============================================================

app.post(
    "/api/admin/parcels/:id/status",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const allowedStatuses = [

                "pending",
                "accepted",
                "picked",
                "delivered",
                "cancelled"

            ];


            const status =
                req.body.status;


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({

                    message:
                        "Invalid parcel status"

                });

            }


            const parcel =
                await Parcel.findByIdAndUpdate(

                    req.params.id,

                    {
                        status
                    },

                    {
                        new: true
                    }

                );


            if (!parcel) {

                return res.status(404).json({

                    message:
                        "Parcel not found"

                });

            }


            io.emit(
                "parcelStatusUpdated",
                parcel
            );


            res.json({

                message:
                    "Parcel status updated",

                parcel

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to update parcel status",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// ADMIN - STATISTICS
// ============================================================

app.get(
    "/api/admin/stats",
    authenticate,
    requireRole("admin"),
    async (req, res) => {

        try {

            const totalUsers =
                await User.countDocuments({});


            const totalDrivers =
                await User.countDocuments({
                    role: "driver"
                });


            const totalPassengers =
                await User.countDocuments({
                    role: "passenger"
                });


            const totalRides =
                await Ride.countDocuments({});


            const completedRides =
                await Ride.countDocuments({
                    status:
                        "completed"
                });


            const activeRides =
                await Ride.countDocuments({

                    status: {
                        $in: [
                            "requested",
                            "accepted",
                            "started"
                        ]
                    }

                });


            const totalParcels =
                await Parcel.countDocuments({});


            const deliveredParcels =
                await Parcel.countDocuments({
                    status:
                        "delivered"
                });


            const activeParcels =
                await Parcel.countDocuments({

                    status: {
                        $in: [
                            "pending",
                            "accepted",
                            "picked"
                        ]
                    }

                });


            res.json({

                totalUsers,

                totalDrivers,

                totalPassengers,

                totalRides,

                completedRides,

                activeRides,

                totalParcels,

                deliveredParcels,

                activeParcels

            });

        } catch (error) {

            res.status(500).json({

                message:
                    "Unable to load statistics",

                error:
                    error.message

            });

        }

    }
);


// ============================================================
// SOCKET.IO
// ============================================================

io.on(
    "connection",
    (socket) => {

        console.log(
            "Socket connected:",
            socket.id
        );


        socket.on(
            "joinRide",
            (rideId) => {

                if (rideId) {

                    socket.join(
                        `ride_${rideId}`
                    );

                }

            }
        );


        socket.on(
            "leaveRide",
            (rideId) => {

                if (rideId) {

                    socket.leave(
                        `ride_${rideId}`
                    );

                }

            }
        );


        socket.on(
            "joinUser",
            (userId) => {

                if (userId) {

                    socket.join(
                        `user_${userId}`
                    );

                }

            }
        );


        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Socket disconnected:",
                    socket.id
                );

            }
        );

    }
);


// ============================================================
// STATIC FRONTEND
// ============================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ============================================================
// HOME PAGE
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


// ============================================================
// 404 API HANDLER
// ============================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            message:
                "API endpoint not found",

            path:
                req.originalUrl

        });

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Server error:",
            error
        );

        res.status(500).json({

            message:
                "Internal server error",

            error:
                error.message

        });

    }
);


// ============================================================
// START SERVER
// ============================================================

server.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "===================================="
        );

        console.log(
            "       UDAN CAB SERVER STARTED"
        );

        console.log(
            "===================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "===================================="
        );

    }
);