import { Request, Response } from "express";
import { generateToken } from "../services/generatetoken";
import { addUser, getUserById, getUserByName, updateUsername , updatePassword, getRoomByCode, checkUserInRoom, addUserToRoom } from "../repositories/user.repository";
import { isVerfied } from "../services/auth.service";
import { Server, Socket } from "socket.io";
import { AuthRequest } from "../middlewares/verifyToken";
import { createRoomGame } from "../repositories/user.repository";
import { getQuestionsFromAI } from "../services/aiModelConnection";
import { saveQuestionToRoom } from "../repositories/user.repository";
import { saveUserAnswer } from "../services/checkcorrectAnswer";

export const login_handle = async (req: Request, res: Response) => {
  const { username, password } = req.body;
 

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await getUserByName(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await isVerfied(username, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({ id: String(user.id), username: user.username });
    

    return res.status(200).json({
      message: "Login successful",
      token,
      userId: user.id,
      username: user.username,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};




export const register_handle = (io: any, socket: any) => {
  socket.on("create_room", async (callback: Function) => {
    try {
      const userId = socket.data.user?.id;

      if (!userId) {
        return callback({ error: "User ID is required" });
      }

      const [room_code, room_id] = await createRoomGame(userId);

      
      socket.data.room_code = room_code;
      socket.data.room_id = room_id;

      callback({ room_code, room_id, created_by: userId });

    } catch (error) {
      console.error("Error creating room:", error);
      callback({ error: "Internal server error" });
    }
  });
};



export const resteusername = async (req:Request , res:Response) =>{
  const{username , newusername , currentpassword} = req.body;
  if(!username || !newusername || !currentpassword){
    return res.status(401).json({error:'all fields are required'})
  }

  try{
    const user = await getUserByName(username);
    if(!user){
       return res.status(404).json({ error: "User not found" });
    }

    if(user.password !== currentpassword){
      return res.status(401).json({ error: "Incorrect old password" });
    }

    await updateUsername(user.id , newusername)
    return res.status(200).json({ message: "username updated successfully" });
  }

  catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
} 




export const restepassword = async (req:Request , res:Response) =>{
  const{username ,  currentpassword , newpassword} = req.body;
  if(!username || !newpassword || !currentpassword){
    return res.status(401).json({error:'all fields are required'})
  }

  try{
    const user = await getUserByName(username);
    if(!user){
       return res.status(404).json({ error: "User not found" });
    }

    if(user.password !== currentpassword){
      return res.status(401).json({ error: "Incorrect old password" });
    }


    await updatePassword(user.id , newpassword)
    return res.status(200).json({ message: "password updated successfully" });
  }

  catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
} 




export const creatRoom = async (req: AuthRequest, res: Response) => {
  try {
    const created_by = req.user?.id;

    if (!created_by) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const [room_code, room_id] = await createRoomGame(created_by);

    res.status(200).json({ room_code, room_id, created_by });

  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};









export const joinRoom = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", async ({ room_code, user_id }) => {
      try {
        if (!room_code || !user_id) {
          socket.emit("join_error", { message: "Room code and user ID are required" });
          return;
        }

        const room = await getRoomByCode(room_code);
        if (!room) {
          socket.emit("join_error", { message: "Room not found" });
          return;
        }

        const alreadyJoined = await checkUserInRoom(room.id, user_id);
        if (!alreadyJoined) {
          await addUserToRoom(user_id, room.id);
        }

        const user = await getUserById(user_id);
        const user_name = user?.username || "Anonymous";

        socket.join(room_code);

        // إبعت لباقي الناس في الروم
        socket.to(room_code).emit("user_joined", {
          user_id,
          user_name,
          message: `${user_name} joined the room`,
        });

      
        // إبعت للي انضم تأكيد
        socket.emit("join_success", {
          message: alreadyJoined ? "Already in room" : "Joined room successfully",
          room_id: room.id,
          room_code,
          user_id,
          user_name,
        });

      } catch (err) {
        console.error(err);
        socket.emit("join_error", { message: "Internal server error" });
      }
    });
  });
};




export const handleStartGame = async (req: Request, res: Response) => {
  const { room_code } = req.body;

  try {
    const io = req.app.get("io");
    const room = await getRoomByCode(room_code);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const questions = await getQuestionsFromAI();

    for (const q of questions) {
      await saveQuestionToRoom(q.question, q.options, q.correct_answer, room.id);
    }

    io.to(room_code).emit("game_started", {
      message: "Game has started!",
      questions,
    });

    io.to(room_code).emit("new_question", {
      question: questions[0],
      index: 0,
    });

    return res.status(200).json({ message: "Game started" });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};


export const handleSaveUserAnswer = async (req: Request, res: Response) => {
  const { user_id, question_id, selected_answer } = req.body;

  if (!user_id || !question_id || !selected_answer) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    await saveUserAnswer(user_id, question_id, selected_answer);
    return res.status(201).json({ message: "Answer saved successfully" });
  } catch (error) {
    console.error("Error saving answer:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};