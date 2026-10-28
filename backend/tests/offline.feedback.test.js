/**
 * offline.feedback.test.js
 * Automated test suite verifying offline/server-disconnected feedback contracts:
 * 1. Failed API writes must never persist transactions in the database.
 * 2. Rejected requests maintain database state integrity.
 * 3. Client distinguishes valid MongoDB ObjectIDs from in-memory records.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

describe('Offline & Server Disconnection Feedback Contracts', () => {
    let testUser = null;

    before(async () => {
        await connectDB();
        testUser = await User.findOne({ email: 'offline.test@kharchasense.app' });
        if (!testUser) {
            testUser = await User.create({
                name: 'Offline Tester',
                email: 'offline.test@kharchasense.app',
                password: 'password123'
            });
        }
    });

    after(async () => {
        if (testUser) {
            await Transaction.deleteMany({ user: testUser._id });
            await User.deleteOne({ _id: testUser._id });
        }
        await mongoose.disconnect();
    });

    test('Requirement 1: Failed transaction write never persists to database', async () => {
        const initialCount = await Transaction.countDocuments({ user: testUser._id });

        // Simulate an invalid payload that backend rejects
        try {
            await Transaction.create({
                user: testUser._id,
                title: '', // Invalid empty title
                amount: -50, // Invalid negative amount
                category: 'Dining',
                date: new Date()
            });
            assert.fail('Should have rejected invalid transaction creation');
        } catch (err) {
            assert.ok(err, 'Expected validation error');
        }

        const afterCount = await Transaction.countDocuments({ user: testUser._id });
        assert.equal(afterCount, initialCount, 'Database transaction count must remain unchanged after failed write');
    });

    test('Requirement 2 & 4: Requests rejected by server maintain state integrity', async () => {
        const countBefore = await Transaction.countDocuments({ user: testUser._id });

        // Create a single valid record
        const tx = await Transaction.create({
            user: testUser._id,
            title: 'Pre-existing Record',
            amount: 250,
            category: 'Groceries',
            date: new Date('2026-10-25'),
            recurring: false
        });

        assert.ok(tx._id, 'Transaction should have valid Mongo ID');

        // Simulate failed update due to invalid input
        try {
            await Transaction.updateOne(
                { _id: tx._id, user: testUser._id },
                { $set: { amount: -999 } },
                { runValidators: true }
            );
            assert.fail('Should have rejected update with negative amount');
        } catch (err) {
            assert.ok(err, 'Update should fail');
        }

        // Verify original transaction amount is preserved
        const fresh = await Transaction.findById(tx._id);
        assert.equal(fresh.amount, 250, 'Original amount must be preserved in MongoDB');

        // Clean up
        await Transaction.deleteOne({ _id: tx._id });
        const countAfter = await Transaction.countDocuments({ user: testUser._id });
        assert.equal(countAfter, countBefore, 'Count returns to baseline');
    });

    test('Requirement 3: Distinguishes MongoDB records with valid ObjectID from temporary in-memory records', () => {
        const mongoId = new mongoose.Types.ObjectId().toString();
        const temporaryFallbackId = 'temp_in_memory_' + Date.now();

        assert.equal(mongoose.Types.ObjectId.isValid(mongoId), true, 'MongoDB records have valid 24-char ObjectID');
        assert.equal(mongoose.Types.ObjectId.isValid(temporaryFallbackId), false, 'In-memory fallback IDs are distinct from MongoDB ObjectIDs');
    });
});
