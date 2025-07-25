import { dataBaseConnection } from "../config/db";
import { user } from "../models/user.model";
import { v4 as uuidv4 } from 'uuid';

export const getUserById = async (id:any):Promise<user> => {
    const [rows]:any = await (await dataBaseConnection.getConnection()).execute('SELECT * FROM users WHERE id = ?' , [id])
    return rows[0];
}


export const addUser = async (username: string, password: string): Promise<string> => {
  const id = uuidv4();
  const [result]: any = await (await dataBaseConnection.getConnection()).execute(
    'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
    [id, username, password]
  );
  return id;
};

  export const getUserByName = async (username: string): Promise<any> => {
  const conn = await dataBaseConnection.getConnection();
  const [rows]: any = await conn.execute(
    'SELECT * FROM users WHERE username = ?',
    [username]
  );
  return rows.length ? rows[0] : null;
};


export const updateUsername = async (id:any , username:string) => {
    (await dataBaseConnection.getConnection()).execute("UPDATE users SET username = ? WHERE id = ?", [username, id])
}
export const updatePassword = async (id:any , password:string) => {
    (await dataBaseConnection.getConnection()).execute("UPDATE users SET password = ? WHERE id = ?", [password, id])
}

export const createRoomGame = async (created_by: string) => {
  try {
    const id = uuidv4();
    const room_code = uuidv4();
    const created_at = new Date();
      const joinedAt = new Date();

    const conn = await dataBaseConnection.getConnection();

    await conn.execute(
      'INSERT INTO rooms (id, room_code, created_by, created_at) VALUES (?, ?, ?, ?)',
      [id, room_code, created_by, created_at]
    );

await conn.execute(
  'INSERT INTO room_players (id ,room_id, user_id, joined_at, is_host) VALUES (?, ?, ?, ?, ?)',
  [id, id, created_by, new Date(), 1]
);

    const shortCode = room_code.substring(0, 10);
    return [shortCode, id];

  } catch (error) {
    console.error("Error in createRoomGame:", error);
    throw error;
  }


};

export const getRoomByCode = async (room_code: string): Promise<{ id: string } | null> => {
  
  const [rows]: any = await (await dataBaseConnection.getConnection()).execute  (
    'SELECT id FROM rooms WHERE room_code = ?',
    [room_code]
  );
  return rows.length ? { id: rows[0].id } : null;
}

export const checkUserInRoom = async(room_id:string , userId:string):Promise<boolean> => {
  const [rows]:any = await ((await dataBaseConnection.getConnection())).execute( 
    'SELECT * FROM room_players WHERE user_id = ? AND room_id = ?',
    [userId, room_id]) 

     return rows.length > 0;
}


export const addUserToRoom = async(userId:string , room_id:string):Promise<void> => {
  const joinedAt = new Date();
  const id = uuidv4();
  await ((await dataBaseConnection.getConnection())).execute( 
    'INSERT INTO room_players (id, user_id, room_id, joined_at) VALUES (? ,?, ?, ?)',
    [ id, userId, room_id, joinedAt]
  ) 

    
}


export const saveQuestionToRoom = async (
  question: string,
  options: string[],
  correct_answer: string,
  room_id: string
): Promise<void> => {
  const id = uuidv4();

  await (
    await dataBaseConnection.getConnection()
  ).execute(
    `INSERT INTO questions (
      id,
      question_text,
      option_1,
      option_2,
      option_3,
      option_4,
      correct_answer,
      room_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      question,
      options[0],
      options[1],
      options[2],
      options[3],
      correct_answer,
      room_id,
    ]
  );
};


export const getCorrectAnswerByQuestionId = async (questionId: string): Promise<string> => {
  const connection = await dataBaseConnection.getConnection();
  const [rows] = await connection.execute(
    `SELECT correct_answer FROM questions WHERE id = ?`,
    [questionId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Question not found");
  }

  return (rows[0] as any).correct_answer;
};

export const saveAnswerToDB = async (
  userId: string,
  questionId: string,
  selectedAnswer: string,
  isCorrect: boolean
): Promise<void> => {
  const connection = await dataBaseConnection.getConnection();
  const id = uuidv4();

  await connection.execute(
    `INSERT INTO answers (id, user_id, question_id, selected_answer, is_correct)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, questionId, selectedAnswer, isCorrect]
  );
};
