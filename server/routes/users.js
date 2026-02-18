//server/routes/users.js 
//ユーザー登録API
//新規登録、重複のバリデーション、パスワードハッシュ化

import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

//新規登録
router.post("/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        //同じユーザー名が存在していないかを確認
        const result = await pool.query(
            "SELECT * FROM users WHERE user_name = $1 ",
            [username]
        );
        if (result.rows.length > 0 ) {
            return res.status(400).json({ error: "そのユーザー名は既に使われています"});
        }
        
        //パスワードハッシュ化
        const hash = await bcrypt.hash(password, 10);
        //10:bcryptの「コスト係数」 値が重いほど安全だが処理が重くなる

        //新規登録
        await pool.query(
        `INSERT INTO users 
        (user_name, password_hash, theme_id) 
        VALUES ($1, $2, $3)
        RETURNING user_id
        `,
        [username, hash, 1]
    );

        res.json({ message: "登録完了" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error:"サーバーエラー"});
    }
});

//ユーザー情報復元
router.get("/me", authMiddleware, async (req, res) => {
    const userId = req.user_id;

    try {
        //同じユーザー名が存在していないかを確認
        const result = await pool.query(
            `SELECT 
            user_id, user_name, theme_id 
            FROM users WHERE user_id = $1 
            `,
            [userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error("user me error", err);
        res.status(500).json({ error:"ユーザー情報取得失敗"});
    }
});

//テーマカラー更新
router.put("/theme", authMiddleware, async (req, res) => {
    const userId = req.user_id;
    const { theme_id } = req.body;

    try {
        await pool.query(
            `UPDATE users
            SET theme_id = $1
            WHERE user_id = $2
            `,
            [theme_id, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("user me error", err);
        res.status(500).json({ error:"テーマカラー更新失敗"});
    }
});

//ユーザー名更新
router.put("/username", authMiddleware, async (req, res) => {
    const userId = req.user_id;
    const { user_name } = req.body;

    if(!user_name) {
        return res.status(400).json({ error:"ユーザー名が必要"})
    }
    try {
        await pool.query(
            `UPDATE users
            SET user_name = $1
            WHERE user_id = $2
            `,
            [user_name, userId]
        );

        res.json({ success: true, user_name });
    } catch (err) {
        console.error("user me error", err);
        res.status(500).json({ error:"ユーザー名更新失敗"});
    }
});

//パスワード更新
router.put("/password", authMiddleware, async (req, res) => {
    const userId = req.user_id;
    const { current_password, new_password } = req.body;

    if(!current_password || !new_password) {
        return res.status(400).json({ error:"パスワードが空欄です。"})
    }

    try {
        //現在のパスワードを取得
        const result = await pool.query(
            `SELECT password_hash 
            FROM users
            WHERE user_id = $1 
            `,
            [userId]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({ error: "ユーザーが見つかりません。"});
        }

        const user = result.rows[0];

        //現在のパスワード照合
        const ok = await bcrypt.compare(current_password, user.password_hash);
        if(!ok) {
            return res.status(401).json({ error: "現在のパスワードが正しくありません。"});
        }
            
        //新しいパスワードをハッシュ化
        const newHash = await bcrypt.hash(new_password, 10);
        //更新
        await pool.query(
            `UPDATE users
            SET password_hash = $1
            WHERE user_id = $2
            `,
            [newHash, userId]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("password update error", err);
        res.status(500).json({ error:"パスワードの更新に失敗しました"});
    }
});

export default router;
