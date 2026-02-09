import express from "express";
import { pool } from "../db.js";
import { authMiddleware } from "../middleware/authMiddleware.js"

const router = express.Router();

console.log("calendar.js 読み込まれた");

//カレンダーに渡す
router.get("/", authMiddleware, async (req, res) => {
    const userId = req.user_id;//JWＴから自動取得

    try {
        const sql = `
            SELECT 
                item.title,
                TO_CHAR(item.deadline, 'YYYY-MM-DD') AS deadline,
                item.cate_id,
                category.bg_color,
                category.font_color
            FROM item
            JOIN category
                ON item.cate_id = category.cate_id
            WHERE
                category.user_id = $1
                AND item.deadline IS NOT NULL
                AND item.is_deleted = false
            ORDER BY item.deadline ASC
            `;
        //category.user_id = ? ⇒ログインユーザーのカテゴリーに属する項目のみ取得
        //AND item.deadline IS NOT NULL ⇒日付が設定されている項目のみ取得
        //AND item.is_deleted = 0 ⇒削除されていないitemだけ取得
        const result = await pool.query(sql, [userId]);
        res.json(result.rows);

    } catch(err) {
        console.error("カレンダーデータ取得エラー：", err);
        res.status(500).json({ error: "カレンダーデータ取得失敗"});
    }
});

export default router;
