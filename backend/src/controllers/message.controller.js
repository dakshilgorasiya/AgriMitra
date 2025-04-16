import { asyncHandler } from '../utils/asyncHandler.js';
import { Message } from '../models/message.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Chat } from '../models/chat.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
const sendMessage = asyncHandler(async (req, res, next) => {
    const { chatId, content } = req.body;
    if (!chatId || !content) {
        return next(new ApiError('Please fill all the fields', 400));
    }
    const messageData = {
        sender: req.user._id,
        content: content,
        chat: chatId,
    }
    try {
        const message = await Message.create(messageData);
        const response = await Message.findOne({ _id: message._id }).populate('sender', "name avatar").populate('chat');
        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });
        return res.status(200).json(new ApiResponse({
            data: response,
            message: 'Message sent successfully',
            statusCode: 200,

        }));
    } catch (error) {
        return next(new ApiError('Failed to send message', 500));
    }
});

const allMessages = asyncHandler(async (req, res, next) => {
    const { chatId } = req.params;
    if (!chatId) {
        return next(new ApiError('Please fill all the fields', 400));
    }
    try {
        const messages = await Message.find({ chat: chatId }).populate('sender', "name avatar").populate('chat');
        return res.status(200).json(new ApiResponse({
            data: messages,
            message: 'Messages fetched successfully',
            statusCode: 200,
        }));
    } catch (error) {
        return next(new ApiError('Failed to fetch messages', 500));
    }
});

export {
    sendMessage,
    allMessages
};