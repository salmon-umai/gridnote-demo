//server/routes/category.js 
//カテゴリAPI

import express from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/authMiddleware.js"

const router = express.Router();

//カテゴリ一覧取得(ログインユーザーの分だけとる)
router.get("/", authMiddleware, async (req, res) => {
    const userId = req.user_id;//JWＴから自動取得

    try {
        const sql = `
            SELECT * FROM category 
                WHERE user_id = $1
                ORDER BY cate_id ASC
        `;
        const result = await pool.query(sql, [userId]);
        res.json(result.rows);

    } catch(err) {
        console.error("カテゴリ取得エラー：", err);
        res.status(500).json({ error: "DB取得エラー"});
    }
});

//カテゴリ追加　POST
router.post("/", authMiddleware, async(req, res) => {
    const userId = req.user_id;
    const { cate_name, bg_color, font_color } = req.body;

    try {
        const sql =`
            INSERT INTO category (
            user_id
            ,cate_name
            ,bg_color
            ,font_color
            ,sort_type
            )
            VALUES ($1, $2, $3, $4, 'created_desc')
            RETURNING cate_id
            `;

            const result = await pool.query(sql,[
                userId
                ,cate_name
                ,bg_color
                ,font_color
            ]);

            //追加したカテゴリを返す（フロント用）
            res.json({
                cate_id: result.rows[0].cate_id
                ,cate_name
                ,bg_color
                ,font_color
                ,sort_type: "created_desc"
            });
    } catch(err) {
        console.error("カテゴリ追加エラー:", err);
        res.status(500).json({ error:"カテゴリ追加に失敗しました"});
    }
});

//カテゴリごとに並び替えを覚える PUT
router.put("/sort", authMiddleware, async (req, res) => {
    const userId = req.user_id;
    const { cate_id, sort_type } = req.body;

    try {
        const sql = `
            UPDATE category
            SET sort_type = $1
            WHERE cate_id = $2 AND user_id = $3
        `;

        await pool.query(sql, [sort_type, cate_id, userId]);
        res.json({ success: true });

    }catch(err) {
        console.error("並び替え更新エラー:", err);
        res.status(500).json({ error:"並び替え更新に失敗しました"}); 
    }
});

//カテゴリ更新　PUT
//カテゴリIDが変わるので可変パス⇒PUTのなかでも後ろに置く
router.put("/:cate_id", authMiddleware, async(req, res) => {
    const userId = req.user_id;
    const { cate_id } = req.params;
    const { cate_name, bg_color, font_color } = req.body;

    try {
        const sql = `
            UPDATE category
            SET
                cate_name = $1
                ,bg_color = $2
                ,font_color = $3
            WHERE cate_id = $4 AND user_id = $5
        `;

        const [result] = await pool.query(sql,[
            cate_name
            ,bg_color
            ,font_color
            ,cate_id
            ,userId
        ]);

        res.json({ update: result.rowCount });

    }catch(err) {
        console.error("カテゴリ更新エラー:", err);
        res.status(500).json({ error:"カテゴリ更新に失敗しました"});
    }
});



//削除処理　DELETE　/api/category/:id
router.delete("/:id", authMiddleware, async (req, res) => {
    const userId = req.user_id;
    const { id } = req.params;

    try {
        const sql =`
            DELETE FROM category
            WHERE cate_id = $1
            AND user_id = $2
            `;
        await pool.query(sql, [id, userId]);

        res.json({ message: "カテゴリ削除OK"});
    } catch(err) {
        console.error("削除エラー",err);
        res.status(500).json({ error: "削除に失敗" });

    }
});

export default router;
