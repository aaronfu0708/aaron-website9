from flask import Flask, request, jsonify
from flask_cors import CORS
# 更新 OpenAI 導入方式
from openai import OpenAI
import os , requests
import json
from dotenv import load_dotenv  
import re
import random
from pathlib import Path


# 載入 .env 檔案
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# 從環境變數獲取配置
DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "https://aaron-website.onrender.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://aaron-website9.vercel.app")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://aaron-website9.vercel.app,https://aaron-website.onrender.com").split(",")

app = Flask(__name__)

# 配置CORS，允許前端和後端跨域調用
CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)


@app.route("/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200


def shuffle_options(q):
    options = [
        ("A", q["option_A"]),
        ("B", q["option_B"]),
        ("C", q["option_C"]),
        ("D", q["option_D"]),
    ]
    correct = q["Ai_answer"]
    correct_text = q[f"option_{correct}"]
    random.shuffle(options)
    # 重新分配選項
    for idx, (opt, text) in enumerate(options):
        q[f"option_{chr(65+idx)}"] = text
    # 找出正確答案的新位置
    for idx, (opt, text) in enumerate(options):
        if text == correct_text:
            q["Ai_answer"] = chr(65+idx)
            break

def generate_mock_questions(topic, count):
    """生成模擬題目（當 AI 服務不可用時使用）"""
    mock_questions = []
    for i in range(count):
        mock_q = {
            "title": f"伺服器維修中",
            "option_A": "錯誤",
            "option_B": "錯誤", 
            "option_C": "錯誤",
            "option_D": "錯誤",
            "User_answer": "",
            "Ai_answer": "A",
            "explanation_text": "錯誤",
            "difficulty_id": 1  
        }
        mock_questions.append(mock_q)
    
    return mock_questions

def generate_questions_with_ai(topic, difficulty, count):
    """使用 AI 生成題目，分批生成以確保穩定性"""
    print(f"=== 開始生成題目 ===")
    print(f"主題: {topic}, 難度: {difficulty}, 總數量: {count}")

    # 檢查 API Key
    api_key = os.getenv('OPENAI_API_KEY', 'your-api-key-here')
    

    if api_key == 'your-api-key-here' or not api_key:
        return generate_mock_questions(topic, count)

    # 如果題目數量 <= 5，直接生成
    if count <= 5:
        return generate_single_batch(topic, difficulty, count)
    
    # 如果題目數量 > 5，分批生成
    print(f"題目數量 {count} > 5，採用分批生成策略")
    return generate_multiple_batches(topic, difficulty, count)

def generate_single_batch(topic, difficulty, count):
    """生成單批題目（1-5題）"""
    print(f"=== 單批生成 {count} 題 ===")
    
    # 使用新版 OpenAI 客戶端
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    prompt = f"""
    你是一個全知的ai，你精通各式各樣的領域。你擅於根據人們給你的主題及難度，生成出與該主題、難度相符的選擇題，提意必須清楚、完整、、邏輯嚴謹、無語病。在你把題目跟選項生成前請你先思考題目及選項是否正確，你習慣先將題目出完後再思考選項怎麼出適合，選項(A/B/C/D)中必有且只有一個正確答案，必須將正確答案隨機分配到(A/B/C/D)四個選項。
    請根據以下條件生成 {count} 道選擇題：

    語言規則：
    1. 如果主題是英文，題目、選項、都必須用英文，explanation_text用繁體中文。
    2. 如果主題不是英文，全部內容都必須用繁體中文。

    數學計算特殊要求：
    1. 對於數學題目，必須逐步展示計算過程
    2. 每一步計算都要仔細驗證
    3. 最後再次檢查答案是否正確
    4. 如果不確定計算結果，請重新計算一遍
    5. 在 explanation_text 中必須詳細顯示完整計算過程
    6. 確認4個option選項內容有正確答案
    7. Ai_answer為正確答案之選項，並且Ai_answer的option選項內容與explanation_text答案相同

    explanation_text 規則：
    1. 必須詳細分步驟解釋解題思路
    2. 補充相關知識點、背景、易錯點
    3. 用教學口吻，讓學生能真正理解
    4. 數學題必須有完整計算過程與驗證
    5. 其他科目要有邏輯推理、事實依據
    6. 禁止空泛、主觀、無意義描述
    7. 如果難度是 beginner，解析必須簡單明瞭，避免使用過多專業術語或複雜推理，只需簡單一句話說明答案，不要分步驟，不要過度教學。適合初學者理解。
    8. 如果難度是 intermediate，解析需包含基本原理與步驟，但不需過度深入。
    9. 如果難度是 advanced 或 master，解析需詳細分步驟、補充相關知識點與背景，適合有基礎的學生深入學習。
    10. 如果有自己設定未知數的話請講清楚是怎麼設定的。

    特殊規則：
    1. 題目必須知識正確、邏輯嚴謹、無語病。
    2. 如果主題為純數字或數字組合，請生成數學計算相關題目，並確保答案正確。
    3. 如果主題為無意義字串（與任何已知領域無關），請直接回傳：
    "主題無法產生合理題目。"
    不要輸出其他內容。
    4. 答案不能是疑問句
    5. 題數必須精確為 {count} 題，不可少於或多於該數量。
    6. 如果{topic}是數學題的話請務必先計算出正確答案，再將正確答案填入 Ai_answer 欄位。請勿猜測或隨意填寫，必保證答案正確。
    7. 題目必須有明確知識點或事實依據，不能只問主觀感受或抽象描述。
    8. 請根據主題的專業背景出題。
    9. 避免空泛、隨意、或只描述顏色、符號等題目。
    10. 禁止出現主觀、感受、意見類題目
    11.可以是動畫、電影、漫畫相關類型題目

    難度說明：
    題目必須與設定的難度相符，避免過於簡單或過於困難。
    - beginner: 基礎概念，適合初學者,difficulty 回傳 beginner
    - intermediate: 中等難度，需要一定理解力 difficulty 回傳 intermediate
    - advanced: 進階內容，需要深入思考 difficulty 回傳 advanced
    - master: 專家級別，需要精熟此{topic}主題才能回答得出來 difficulty 回傳 master
    - test: 測試題目，由beginner intermediate advanced master四種難度平均組成，根據題目的難度回傳對應的數值

    輸入參數：
    主題：{topic} 
    難度：{difficulty}
    題目數量：{count} 題（必須生成完整的 {count} 題，且不會有重複的題目）


    每道題目需包含：
    1. 題目描述 (title) - 除了英文題目以外請使用繁體中文
    2. 四個選項 (option_A, option_B, option_C, option_D) - 除了英文題目以外請使用繁體中文
    3. 正確答案 (Ai_answer: A/B/C/D)
    4. 題目解析 (explanation_text) - 除了英文題目以外請使用繁體中文
    請回傳json format, do not use markdown syntax only text，格式如下：
    [
        {{
            "title": "題目描述（繁體中文）",
            "option_A": "選項A",
            "option_B": "選項B", 
            "option_C": "選項C",
            "option_D": "選項D",
            "Ai_answer":"A",
            "difficulty_id": 1,
            "explanation_text": "這是題目的解析"(繁體中文)
        }}
    ]
    
    難度等級對應的 difficulty_id：
    - beginner: 1
    - intermediate: 2  
    - advanced: 3
    - master: 4
    """


    try:
        # 使用新版 API 語法
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一個題目生成助手，請根據使用者的需求生成題目。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,  # 適中溫度，保持創意性
            max_tokens=4000   # 限制長度，提升生成速度
        )

        ai_response = response.choices[0].message.content
        print(f"=== OpenAI API 回應詳情 ===")
        print(f"使用的 tokens: {response.usage.total_tokens if hasattr(response, 'usage') else '未知'}")
        print(f"完成原因: {response.choices[0].finish_reason if hasattr(response.choices[0], 'finish_reason') else '未知'}")
        print(f"回應長度: {len(ai_response)} 字元")
        print(f"AI 回應: {ai_response}")
        print(f"===+++++++++++++++++++===")
        return parse_ai_response(ai_response, count)

    except Exception as e:
        print(f"❌ OpenAI API 錯誤: {str(e)}")
        print(f"錯誤類型: {type(e).__name__}")
        return generate_mock_questions(topic, count)


def parse_ai_response(ai_text, count=1):
    """解析 AI 回應格式化為標準格式"""
    try:
        # 先印出 AI 的原始回應來除錯
        print(f"AI 原始回應: {ai_text}")
        print(f"回應長度: {len(ai_text)} 字元")

        # 移除 markdown code block 標記
        ai_text = re.sub(r"^```json\s*|```$", "", ai_text.strip(), flags=re.MULTILINE)

        # 嘗試直接解析 JSON
        questions = json.loads(ai_text)
        print(f"解析出的題目數量: {len(questions)} , 內容: {questions}")
        # 驗證格式並補充缺失欄位
        formatted_questions = []
        for q in questions:
            # 處理 difficulty_id 轉換
            difficulty_id = q.get("difficulty_id", 1)
            if isinstance(difficulty_id, str):
                difficulty_mapping = {
                    'beginner': 1,
                    'intermediate': 2,
                    'advanced': 3,
                    'master': 4
                }
                difficulty_id = difficulty_mapping.get(difficulty_id, 1)
            
            formatted_q = {
            "title": q.get("title", "預設題目"),
            "option_A": q.get("option_A", "選項A"),
            "option_B": q.get("option_B", "選項B"),
            "option_C": q.get("option_C", "選項C"),
            "option_D": q.get("option_D", "選項D"),
            "User_answer": "",  # 預設空值
            "explanation_text": q.get("explanation_text", "這是題目的解析"),
            "Ai_answer": q.get("Ai_answer", "A"),
            "difficulty_id": difficulty_id
            }
            shuffle_options(formatted_q)
            ai_ans = formatted_q["Ai_answer"]
            formatted_q["explanation_text"] = re.sub(r"(答案是\s*[ABCD])", f"答案是 {ai_ans}", formatted_q["explanation_text"])
            formatted_q["explanation_text"] = re.sub(r"(即選項\s*[ABCD])", f"即選項 {ai_ans}", formatted_q["explanation_text"])
            formatted_questions.append(formatted_q)
            print(f"格式化後的題目formatted_questions: {formatted_questions}")
        return formatted_questions

    except json.JSONDecodeError as e:
        # 如果解析失敗，回傳模擬資料
        print(f"JSON 解析錯誤: {str(e)}")
        print(f"無法解析的內容: {ai_text[:200]}...")  # 只顯示前200字元
        return generate_mock_questions("解析失敗", count)

@app.route('/api/quiz', methods=['POST'])
def create_quiz():
    """使用 AI 生成題目"""
    try:
        data = request.json
        print(f"=== Flask 接收到的請求 ===")
        print(f"完整請求數據: {data}")
        print(f"請求來源: {request.headers.get('User-Agent', 'Unknown')}")
        
        # 檢查字符編碼
        topic_raw = data.get('topic', '')
        print(f"原始 topic: {repr(topic_raw)}")
        print(f"topic 類型: {type(topic_raw)}")
        print(f"topic 編碼: {topic_raw.encode('utf-8') if isinstance(topic_raw, str) else 'N/A'}")
        print("=" * 50)
        
        # 強制輸出到控制台
        import sys
        sys.stdout.flush()
        
        topic = data.get('topic', '')
        difficulty = data.get('difficulty', 'test')
        question_count = data.get('question_count', 1)
        
        print(f"解析的參數:")
        print(f"  topic: {topic}")
        print(f"  difficulty: {difficulty}")
        print(f"  question_count: {question_count}")
        print("=" * 50)

        # 驗證難度等級
        valid_difficulties = ['beginner', 'intermediate', 'advanced', 'master', 'test']
        if difficulty not in valid_difficulties:
            return jsonify({
                "error": f"Invalid difficulty level. Valid options are: {', '.join(valid_difficulties)}"
            }), 400

        if not topic:
            return jsonify({"error": "Topic is required"}), 400
        
        # 呼叫 AI 生成題目
        generated_questions = generate_questions_with_ai(topic, difficulty, question_count)
        print(f"生成的題目數量: {len(generated_questions)}, 內容: {generated_questions}")
        # 直接返回生成的題目，讓 Django 處理儲存
        return jsonify({
            "quiz_topic": topic,
            "questions": generated_questions,
            "message": "Questions generated successfully"
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/quiz_list', methods=['GET'])
def get_quiz():
    """從 Django API 獲取 quiz 和相關的 topic 數據"""
    try:
        # 調用 Django API 而不是直接連接資料庫
        
        # 這裡需要一個有效的 JWT token 來調用 Django API
        # 你可能需要根據實際情況調整認證方式
        django_response = requests.get(f'{DJANGO_BASE_URL}/api/create_quiz/')

        if django_response.status_code != 200:
            return jsonify({
                "error": f"Django API error: {django_response.status_code}",
                "details": django_response.text
            }), 500
        
        # 直接返回 Django 的響應
        return jsonify(django_response.json())
        
    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Cannot connect to Django service. Make sure it is running on port 8000."
        }), 503
    except Exception as e:
        return jsonify({"error": f"Flask service error: {str(e)}"}), 500

@app.route('/api/get_quiz/', methods=['GET'])
def get_quiz_alt():
    # 重定向到 Django API
    try:
        django_response = requests.get(f'{DJANGO_BASE_URL}/api/quiz/')
        
        if django_response.status_code != 200:
            return jsonify({
                "error": f"Django API error: {django_response.status_code}",
                "details": django_response.text
            }), 500
        
        return jsonify(django_response.json())
        
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500


@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """處理 AI 聊天請求，支援歷史對話"""
    try:
        data = request.json
        topic_id = data.get('topic_id')
        user_id = data.get('user_id')
        content = data.get('content')
        topic_data = data.get('topic_data', {})
        chat_history = data.get('chat_history', [])

        if not topic_id or not user_id or not content:
            return jsonify({"error": "topic_id, user_id, and content are required"}), 400

        print(f"=== 處理聊天請求 ===")
        print(f"用戶ID: {user_id}, 主題ID: {topic_id}")
        print(f"用戶訊息: {content}")
        print(f"歷史對話數量: {len(chat_history)}")

        # 檢查 API Key
        api_key = os.getenv('OPENAI_API_KEY', 'your-api-key-here')

        if api_key == 'your-api-key-here' or not api_key:
            # 使用假資料回應
            mock_response = {
                "topic_id": topic_id,
                "user_id": user_id,
                "response": f"這是針對您的問題「{content}」的 AI 回應。基於您的對話歷史，我理解您想了解更多相關內容。",
                "sender": "ai"
            }
            return jsonify(mock_response), 200

        # 使用真實 OpenAI API
        try:
            client = OpenAI(api_key=api_key)
            
            # 構建對話上下文
            messages = [
                {
                    "role": "system", 
                    "content": "你是一個有用的學習助手，專門協助學生理解題目和相關知識。請用繁體中文回答，並根據對話歷史提供連貫的回應。"
                    "這是題目的敘述與選項：\n"
                    f"題目: {topic_data.get('title', '未知題目')}\n"
                    f"選項:\n"
                    f"A. {topic_data.get('option_A', '未知選項')}\n"
                    f"B. {topic_data.get('option_B', '未知選項')}\n"
                    f"C. {topic_data.get('option_C', '未知選項')}\n"
                    f"D. {topic_data.get('option_D', '未知選項')}\n"
                    f"AI 答案: {topic_data.get('Ai_answer', '未知答案')}\n"
                    f"解釋: {topic_data.get('explanation_text', '未知解釋')}\n"
                }
            ]
            
            # 添加歷史對話
            for chat in chat_history[:-1]:  # 排除最後一條（當前用戶訊息）
                role = "user" if chat['sender'] == 'user' else "assistant"
                messages.append({
                    "role": role,
                    "content": chat['content']
                })
            
            # 添加當前用戶訊息
            messages.append({
                "role": "user",
                "content": content
            })
            
            print(f"發送給 OpenAI 的訊息數量: {len(messages)}")
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            ai_response = response.choices[0].message.content
            
            return jsonify({
                "topic_id": topic_id,
                "user_id": user_id,
                "response": ai_response,
                "sender": "ai",
                "tokens_used": response.usage.total_tokens if hasattr(response, 'usage') else 0
            }), 200
            
        except Exception as e:
            print(f"❌ OpenAI API 錯誤: {str(e)}")
            # 如果 API 失敗，回退到智能假資料
            smart_mock_response = generate_smart_response(content, chat_history)
            return jsonify({
                "topic_id": topic_id,
                "user_id": user_id,
                "response": smart_mock_response,
                "sender": "ai",
                "note": "使用本地回應（OpenAI API 不可用）"
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def generate_smart_response(user_content, chat_history):
    """基於用戶輸入和歷史生成智能假回應"""
    # 分析用戶問題類型
    if any(keyword in user_content.lower() for keyword in ['什麼', '如何', '怎麼', '為什麼']):
        response_type = "解釋"
    elif any(keyword in user_content.lower() for keyword in ['舉例', '例子', '範例']):
        response_type = "舉例"
    elif any(keyword in user_content.lower() for keyword in ['步驟', '流程', '過程']):
        response_type = "步驟說明"
    else:
        response_type = "一般回應"
    
    # 檢查歷史對話是否有相關內容
    context = ""
    if chat_history:
        context = f"根據我們之前的討論，"
    
    # 生成對應的回應
    responses = {
        "解釋": f"{context}關於「{user_content}」，我來為您詳細解釋。這個概念涉及多個層面，讓我一步步為您說明其核心要點和應用場景。",
        "舉例": f"{context}針對您提到的「{user_content}」，我可以提供一些具體的例子來幫助您理解。",
        "步驟說明": f"{context}對於「{user_content}」的流程，我建議按照以下步驟進行：1) 先分析問題 2) 制定策略 3) 執行方案 4) 檢查結果。",
        "一般回應": f"{context}感謝您的問題「{user_content}」。讓我基於相關知識為您提供有用的見解和建議。"
    }
    
    return responses.get(response_type, f"我理解您關於「{user_content}」的問題，讓我為您提供相關的資訊和建議。")



# GPT統整note content 資料

def parse_note_content(content):
    print("----content內容------")
    print(content)
    print("----content內容------")
    api_key = os.getenv('OPENAI_API_KEY', '')
    if api_key == '' or not api_key:
        print("API key is missing.")
        return content  # 直接返回原始內容

    print("~~~~~~~~~~~~~~~~~")
    try:
        client = OpenAI(api_key=api_key)
        prompt = f"""
        1. 分析文章內容，提取關鍵主題。
        2. 根據主題，設計一個測驗標題。
        3. 測驗標題需簡短、清晰、有吸引力，且字數不超過30字。
        4. 只輸出測驗標題，不需要多餘解釋。
        需整理內容：{content}

        請直接回傳整理後的內容，不要使用任何格式標記。
        """
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.8
        )
        
        processed_content = response.choices[0].message.content.strip()
        print("----以下GPT彙整content內容----")
        print(processed_content)
        print("----以上GPT彙整content內容 END------")

        return processed_content  # 返回處理後的純文字內容
        
    except Exception as e:
        print(f"GPT 處理錯誤: {str(e)}")
        return content  # 如果出錯，返回原始內容


@app.route('/api/retest',methods=['POST'])
def retest():
    # 取出django輸入的 content
    try:
        data=request.json
        content = data.get('content', '內容未提供')

        if content =="內容未提供" :
            return jsonify({"error": "內容未提供"}), 400

        # 進行重新測試的content整理
        parse_content = parse_note_content(content)
        return jsonify({"content": parse_content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GPT 解析題目
# 目前整合在一起 暫時保留
# -----------------------------------
@app.route('/api/parse_answer', methods=['POST'])
def parse_answer():
    print("=== 開始解析答案 ===")
    data = request.json
    title = data.get('title')
    Ai_answer = data.get('Ai_answer')
    print(f"接收到 {title} {Ai_answer}")
    if not title or not Ai_answer:
        return jsonify({"error": "Title and AI answer are required"}), 400

    # Call OpenAI API to parse the question
    api_key = os.getenv('OPENAI_API_KEY', '')
    if not api_key:
        return jsonify({"error": "API key is missing"}), 400

    try:
        client = OpenAI(api_key=api_key)
        prompt = f"""
        你是一個題目解析專家，請根據以下內容進行詳細解釋：
        題目:{title},解答:{Ai_answer}
        直接回傳整理後的內容，不要使用任何格式標記。
        """
        response = client.chat.completions.create(
            model="gpt-4.0",
            messages=[
                {
                    "role": "user", 
                    "content":
                    f"""
                        題目:{title}
                        解答:{Ai_answer}
                        解析:{prompt}
                    """
                }
            ]
        )

        parsed_answer = response.choices[0].message.content.strip()
        return jsonify({"parsed_answer": parsed_answer}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# -----------------------------------
# 目前整合在一起 暫時保留
# GPT 解析題目

# 移除 SocketIO 相關函數
# @socketio.on('generate_quiz')
# def handle_generate_quiz(data):
#     topic = data.get('topic')
#     difficulty = data.get('difficulty')
#     count = data.get('question_count', 1)
#     batch_size = data.get('batch_size', 3)
#     total = count
#     while total > 0:
#         curr_batch = min(batch_size, total)
#         batch_questions = _generate_questions_batch(topic, difficulty, curr_batch)
#         emit('quiz_batch', batch_questions)  # 推送一批題目給前端
#         total -= curr_batch
#     emit('quiz_done', {'message': 'All questions generated.'})

@app.route('/api/generate_topic_from_note', methods=['POST'])
def generate_topic_from_note():
    """根據筆記內容AI生成遊戲主題"""
    try:
        # 檢查認證（可選，因為這是內部服務）
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            # 這裡可以添加token驗證邏輯
            print(f"收到認證token: {token[:10]}...")
        
        data = request.json
        note_content = data.get('note_content', '')
        note_title = data.get('note_title', '')  # 新增：獲取筆記標題
        
        if not note_content:
            return jsonify({"success": False, "message": "筆記內容不能為空"}), 400
        
        # 檢查筆記內容長度
        if len(note_content) > 10000:  # 限制內容長度
            return jsonify({"success": False, "message": "筆記內容過長，請縮短後再試"}), 400
        
        # 檢查 API Key
        api_key = os.getenv('OPENAI_API_KEY', 'your-api-key-here')
        
        if api_key == 'your-api-key-here' or not api_key:
            # 如果沒有API Key，使用改進的備用邏輯
            fallback_topic = generate_enhanced_fallback_topic_from_note(note_content, note_title)
            return jsonify({
                "success": True,
                "topic": fallback_topic,
                "message": "使用改進的備用邏輯生成主題",
                "is_fallback": True
            })
        
        # 使用 OpenAI API 生成主題
        client = OpenAI(api_key=api_key)
        
        # 改進的AI提示詞
        prompt = f"""
        你是一個專業的學習主題生成專家，擅長分析各種類型的筆記內容並提取核心概念。

        請分析以下筆記標題和內容，生成一個適合製作練習題的遊戲主題名稱：

        筆記標題：
        {note_title}

        筆記內容：
        {note_content}

        分析要求：
        1. 優先分析筆記標題，標題通常包含核心主題和關鍵概念
        2. 結合標題和內容，識別主要概念、關鍵詞和核心主題
        3. 考慮內容的學科領域、難度層次和實用性
        4. 主題名稱要簡潔明了，控制在5-15個字之間
        5. 要能準確反映筆記的核心內容和學習目標
        6. 適合製作選擇題練習，有明確的知識點
        7. 優先使用繁體中文，但如果是英文內容可用英文
        8. 避免過於籠統、抽象或主觀的名稱
        9. 優先選擇具體、可測量的學習目標

        內容類型識別和處理規則：
        
        語言學習類：
        - 英文內容：使用「英文語法練習」、「英文詞彙測驗」、「英文閱讀理解」等明確格式
        - 日文內容：使用「日語基礎練習」、「日語語法測驗」格式
        - 其他語言：使用「語言名稱主題練習」格式
        
        動漫遊戲類：
        - 動漫內容：使用「動漫作品名稱知識測驗」格式
        - 遊戲內容：使用「遊戲名稱策略練習」格式
        - 二次元文化：使用「二次元文化知識測驗」格式
        
        娛樂文化類：
        - 電影電視：使用「影視作品類型主題測驗」格式
        - 音樂藝術：使用「音樂風格技巧練習」格式
        - 流行文化：使用「流行文化概念測驗」格式
        
        專業技能類：
        - 技術技能：使用「技能名稱應用練習」格式
        - 職業技能：使用「職業技能名稱測驗」格式
        - 生活技能：使用「生活技能名稱練習」格式
        
        學術研究類：
        - 如果是數學相關：使用「數學概念名稱練習」格式
        - 如果是科學相關：使用「學科名稱具體概念練習」格式
        - 如果是人文相關：使用「學科名稱主題練習」格式

        特殊情況處理：
        - 混合語言內容：優先使用主要語言，可適當混合
        - 專業術語：保留專業術語，使用繁體中文解釋
        - 文化特定內容：尊重原文化，使用適當的命名方式
        - 創意內容：鼓勵創意表達，但保持主題明確

        請直接回傳主題名稱，不要加任何其他內容、格式標記或解釋。
        """
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "你是一個學習主題生成助手，請根據筆記內容生成合適的練習題主題。只回傳主題名稱，不要其他內容。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,  # 降低溫度，提高一致性
            max_tokens=50      # 減少token使用
        )
        
        ai_response = response.choices[0].message.content.strip()
        
        # 改進的AI回應清理邏輯
        topic = clean_ai_response(ai_response)
        
        if not topic or len(topic) > 25 or len(topic) < 3:
            # 如果AI生成的主題無效，使用改進的備用邏輯
            fallback_topic = generate_enhanced_fallback_topic_from_note(note_content, note_title)
            return jsonify({
                "success": True,
                "topic": fallback_topic,
                "message": "AI生成主題無效，使用改進的備用邏輯",
                "is_fallback": True
            })
        
        return jsonify({
            "success": True,
            "topic": topic,
            "message": "成功生成主題",
            "is_fallback": False
        })
        
    except Exception as e:
        print(f"生成主題時發生錯誤: {str(e)}")
        
        # 發生錯誤時使用改進的備用邏輯
        try:
            fallback_topic = generate_enhanced_fallback_topic_from_note(note_content, note_title)
            return jsonify({
                "success": True,
                "topic": fallback_topic,
                "message": "AI服務錯誤，使用改進的備用邏輯",
                "is_fallback": True
            })
        except Exception as fallback_error:
            print(f"改進的備用邏輯也失敗: {str(fallback_error)}")
            return jsonify({
                "success": False,
                "message": f"生成主題失敗: {str(e)}"
            }), 500

def clean_ai_response(ai_response):
    """清理AI回應，提取純淨的主題名稱"""
    if not ai_response:
        return ""
    
    # 移除常見的前綴和後綴
    prefixes_to_remove = [
        '主題：', '主題名稱：', '建議主題：', '推薦主題：', '生成主題：',
        '主題是：', '主題為：', '主題叫做：', '主題名稱是：'
    ]
    
    suffixes_to_remove = [
        '練習', '測驗', '測試', '題目', '問題', '考題'
    ]
    
    # 移除前綴
    cleaned = ai_response
    for prefix in prefixes_to_remove:
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    
    # 移除後綴
    for suffix in suffixes_to_remove:
        if cleaned.endswith(suffix):
            cleaned = cleaned[:-len(suffix)].strip()
    
    # 移除引號和特殊符號
    cleaned = cleaned.replace('"', '').replace('"', '').replace('「', '').replace('」', '').replace('『', '').replace('』', '')
    cleaned = cleaned.replace('：', '').replace(':', '').replace('。', '').replace('！', '').replace('？', '')
    
    # 移除多餘的空白
    cleaned = ' '.join(cleaned.split())
    
    return cleaned

def generate_enhanced_fallback_topic_from_note(note_content, note_title=''):
    """改進的備用主題生成邏輯"""
    if not note_content and not note_title:
        return "綜合知識練習"
    
    # 優先使用標題，如果沒有標題則使用內容
    primary_text = note_title if note_title else note_content
    content = str(primary_text).lower()
    
    # 擴展的學科關鍵詞映射
    subject_keywords = {
        '數學': [
            '數學', '計算', '公式', '幾何', '代數', '微積分', '統計', '概率', '函數', '方程', '不等式',
            '三角', '向量', '矩陣', '數列', '極限', '導數', '積分', '微分', '線性', '非線性'
        ],
        '物理': [
            '物理', '力學', '電學', '光學', '熱學', '量子', '相對論', '牛頓', '愛因斯坦', '能量', '動量',
            '電場', '磁場', '波', '聲', '光', '溫度', '壓力', '密度', '速度', '加速度'
        ],
        '化學': [
            '化學', '分子', '原子', '反應', '元素', '化合物', '離子', '鍵', '酸', '鹼', '氧化', '還原',
            '催化', '平衡', '速率', '濃度', 'pH值', '有機', '無機', '生物化學'
        ],
        '生物': [
            '生物', '細胞', '基因', '進化', '生態', '解剖', '生理', '遺傳', '免疫', '神經', '循環',
            '消化', '呼吸', '繁殖', '代謝', '酶', '蛋白質', 'DNA', 'RNA', '染色體'
        ],
        '歷史': [
            '歷史', '古代', '近代', '戰爭', '革命', '文化', '文明', '帝國', '王朝', '政治', '社會',
            '經濟', '宗教', '哲學', '藝術', '文學', '科學', '技術', '地理', '民族'
        ],
        '地理': [
            '地理', '地形', '氣候', '人口', '經濟', '環境', '自然', '人文', '區域', '國家', '城市',
            '山脈', '河流', '海洋', '沙漠', '森林', '草原', '資源', '產業', '交通'
        ],
        '文學': [
            '文學', '小說', '詩歌', '散文', '戲劇', '作者', '作品', '風格', '流派', '主題', '情節',
            '人物', '語言', '修辭', '意象', '象徵', '諷刺', '幽默', '浪漫', '現實'
        ],
        '語言': [
            '語言', '語法', '詞彙', '發音', '翻譯', '寫作', '閱讀', '聽力', '口語', '文法', '句型',
            '時態', '語態', '語氣', '連接詞', '介詞', '冠詞', '形容詞', '副詞', '動詞'
        ],
        '計算機': [
            '計算機', '程式', '算法', '數據', '網絡', '軟件', '硬體', '編程', '開發', '設計', '測試',
            '數據庫', '人工智能', '機器學習', '深度學習', '雲計算', '大數據', '區塊鏈', '物聯網'
        ],
        '經濟': [
            '經濟', '市場', '貿易', '金融', '投資', '政策', '貨幣', '銀行', '股票', '債券', '匯率',
            '通貨膨脹', '失業', 'GDP', '供需', '價格', '成本', '利潤', '競爭', '壟斷'
        ],
        '心理學': [
            '心理', '認知', '行為', '情緒', '人格', '發展', '社會', '臨床', '實驗', '學習', '記憶',
            '注意力', '思維', '動機', '態度', '價值觀', '群體', '文化', '健康'
        ],
        '哲學': [
            '哲學', '邏輯', '倫理', '美學', '形而上學', '認識論', '存在', '意識', '自由', '正義',
            '真理', '知識', '理性', '經驗', '懷疑', '辯證', '唯心', '唯物', '實用主義'
        ]
    }
    
    # 新增：語言學習關鍵詞
    language_keywords = {
        '英文': [
            'english', 'english', '英語', '英文', '英語', 'english', 'english', 'english', 'english', 'english',
            'grammar', 'vocabulary', 'pronunciation', 'translation', 'writing', 'reading', 'listening', 'speaking',
            'tense', 'verb', 'noun', 'adjective', 'adverb', 'preposition', 'conjunction', 'article'
        ],
        '日文': [
            '日語', '日文', '日本語', 'ひらがな', 'カタカナ', '漢字', '文法', '語彙', '發音', '翻訳',
            'writing', 'reading', 'listening', 'speaking', '敬語', '助詞', '動詞', '形容詞', '名詞'
        ],
        '韓文': [
            '韓語', '韓文', '한국어', '한글', '문법', '어휘', '발음', '번역', 'writing', 'reading'
        ],
        '法文': [
            '法語', '法文', 'français', 'francais', 'grammaire', 'vocabulaire', 'prononciation', 'traduction'
        ],
        '德文': [
            '德語', '德文', 'deutsch', 'grammatik', 'wortschatz', 'aussprache', 'übersetzung'
        ]
    }
    
    # 新增：動漫遊戲關鍵詞
    anime_game_keywords = {
        '動漫': [
            '動漫', '動畫', '漫畫', 'anime', 'manga', '二次元', '角色', '劇情', '聲優', 'op', 'ed',
            '輕小說', '輕小', 'galgame', '視覺小說', '視覺小說', '視覺小說', '視覺小說'
        ],
        '遊戲': [
            '遊戲', 'game', 'rpg', 'mmorpg', 'fps', 'moba', '策略', '動作', '冒險', '解謎', '模擬',
            '競技', '單機', '網遊', '手遊', '主機', 'pc', 'steam', 'switch', 'ps5', 'xbox'
        ],
        '二次元文化': [
            'cosplay', '同人', '手辦', '模型', '周邊', '應援', '粉絲', '宅', '萌', '燃', '百合', 'bl',
            '腐女', '蘿莉', '御姐', '正太', '大叔', '傲嬌', '天然', '病嬌', '三無'
        ]
    }
    
    # 新增：娛樂文化關鍵詞
    entertainment_keywords = {
        '影視': [
            '電影', '電視', '劇', '影視', 'movie', 'tv', 'drama', 'series', 'show', 'film', 'cinema',
            '導演', '演員', '編劇', '製片', '票房', '收視率', '劇情', '特效', '配樂', '剪輯'
        ],
        '音樂': [
            '音樂', '歌曲', '歌手', '樂團', '樂器', '作曲', '作詞', '編曲', '音樂', 'music', 'song',
            'pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'r&b', 'country', 'folk'
        ],
        '藝術': [
            '藝術', '繪畫', '雕塑', '攝影', '設計', '建築', '時尚', 'art', 'painting', 'sculpture',
            'photography', 'design', 'architecture', 'fashion', '素描', '水彩', '油畫', '版畫'
        ]
    }
    
    # 檢查內容中是否包含學科關鍵詞
    for subject, keywords in subject_keywords.items():
        if any(keyword in content for keyword in keywords):
            # 根據內容長度和複雜度選擇合適的後綴
            if len(content) > 500:
                return f"{subject}進階練習"
            elif len(content) > 200:
                return f"{subject}綜合練習"
            else:
                return f"{subject}基礎練習"
    
    # 檢查語言學習內容
    for language, keywords in language_keywords.items():
        if any(keyword in content for keyword in keywords):
            # 檢測主要語言
            if language == '英文' and any(word in content for word in ['english', 'grammar', 'vocabulary']):
                return "英文語法練習"
            elif language == '英文':
                return "英文語法練習"
            elif language == '日文':
                return "日語基礎練習"
            elif language == '韓文':
                return "韓語基礎練習"
            elif language == '法文':
                return "法語基礎練習"
            elif language == '德文':
                return "德語基礎練習"
    
    # 檢查動漫遊戲內容
    for category, keywords in anime_game_keywords.items():
        if any(keyword in content for keyword in keywords):
            if category == '動漫':
                # 嘗試識別具體作品
                anime_titles = ['海賊王', '火影', '死神', '進擊的巨人', '鬼滅之刃', '咒術迴戰', '鋼彈', 'eva']
                for title in anime_titles:
                    if title in content:
                        return f"{title}相關練習"
                return "動漫知識練習"
            elif category == '遊戲':
                # 嘗試識別具體遊戲
                game_titles = ['minecraft', 'fortnite', 'lol', 'dota', 'csgo', 'valorant', '原神', '崩壞']
                for title in game_titles:
                    if title in content:
                        return f"{title}遊戲練習"
                return "遊戲策略練習"
            elif category == '二次元文化':
                return "二次元文化練習"
    
    # 檢查娛樂文化內容
    for category, keywords in entertainment_keywords.items():
        if any(keyword in content for keyword in keywords):
            if category == '影視':
                return "影視作品練習"
            elif category == '音樂':
                return "音樂欣賞練習"
            elif category == '藝術':
                return "藝術鑑賞練習"
    
    # 智能內容分析（優先分析標題，如果沒有標題則分析內容）
    analysis_content = note_title if note_title else note_content
    content_analysis = analyze_content_complexity(analysis_content)
    
    # 根據內容特徵生成主題
    if content_analysis['has_formulas']:
        return "數學公式練習"
    elif content_analysis['has_code']:
        return "程式設計練習"
    elif content_analysis['has_dates']:
        return "歷史時間練習"
    elif content_analysis['has_numbers']:
        return "數值分析練習"
    elif content_analysis['has_questions']:
        return "問題思考練習"
    elif content_analysis['has_lists']:
        return "條理整理練習"
    elif content_analysis['has_english']:
        return "英文語法練習"
    elif content_analysis['has_japanese']:
        return "日語基礎練習"
    
    # 提取關鍵詞生成主題（優先從標題提取，如果沒有標題則從內容提取）
    key_words = extract_key_words(analysis_content)
    if key_words:
        if len(key_words) == 1:
            return f"{key_words[0]}相關練習"
        else:
            return f"{key_words[0]}與{key_words[1]}練習"
    
    return "綜合知識練習"

def analyze_content_complexity(content):
    """分析內容複雜度和特徵"""
    analysis = {
        'has_formulas': bool(re.search(r'[+\-*/=()\[\]{}]', content)),
        'has_code': bool(re.search(r'(def|class|import|function|var|let|const)', content, re.IGNORECASE)),
        'has_dates': bool(re.search(r'\d{4}年|\d{1,2}月|\d{1,2}日|\d{4}-\d{1,2}-\d{1,2}', content)),
        'has_numbers': bool(re.search(r'\d+\.?\d*', content)),
        'has_questions': bool(re.search(r'[？?]', content)),
        'has_lists': bool(re.search(r'^\s*[-*•]\s|^\s*\d+\.\s', content, re.MULTILINE)),
        'has_english': bool(re.search(r'[a-zA-Z]{3,}', content)),  # 檢測英文單詞
        'has_japanese': bool(re.search(r'[あ-んア-ン一-龯]', content)),  # 檢測日文字符
        'has_korean': bool(re.search(r'[가-힣]', content)),  # 檢測韓文字符
        'has_chinese': bool(re.search(r'[\u4e00-\u9fff]', content)),  # 檢測中文字符
        'has_emoji': bool(re.search(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002600-\U000027BF]', content)),  # 檢測emoji
        'has_urls': bool(re.search(r'https?://[^\s]+', content)),  # 檢測URL
        'has_hashtags': bool(re.search(r'#[^\s]+', content)),  # 檢測標籤
        'has_mentions': bool(re.search(r'@[^\s]+', content))  # 檢測提及
    }
    return analysis

def extract_key_words(content):
    """提取內容中的關鍵詞，支持多語言"""
    if not content:
        return []
    
    # 移除標點符號和特殊字符，但保留中文字符
    cleaned = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', content)
    
    # 分割成單詞
    words = cleaned.split()
    
    # 多語言停用詞
    stop_words = {
        # 中文停用詞
        '的', '是', '在', '有', '和', '與', '或', '但', '而', '如果', '因為', '所以', '這個', '那個', '這些', '那些',
        '了', '着', '過', '來', '去', '到', '從', '向', '對', '為', '給', '被', '把', '讓', '使', '得',
        '很', '非常', '特別', '比較', '更', '最', '太', '真', '好', '壞', '大', '小', '高', '低', '長', '短',
        '我', '你', '他', '她', '它', '我們', '你們', '他們', '她們', '它們',
        '什麼', '怎麼', '為什麼', '哪裡', '什麼時候', '多少', '幾個',
        
        # 英文停用詞
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
        'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom',
        
        # 日文停用詞
        'は', 'が', 'を', 'に', 'へ', 'で', 'から', 'まで', 'より', 'の', 'と', 'や', 'も', 'か', 'ね', 'よ',
        'です', 'ます', 'だ', 'である', 'いる', 'ある', 'する', 'なる', 'できる', '見る', '聞く',
        'これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ',
        
        # 通用停用詞
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    }
    
    # 過濾短詞和常見詞
    filtered_words = []
    for word in words:
        word_lower = word.lower()
        # 保留長度大於1的詞，且不在停用詞列表中
        if len(word) > 1 and word_lower not in stop_words:
            # 檢查是否包含有效字符（至少包含一個字母或中文字符）
            if re.search(r'[a-zA-Z\u4e00-\u9fff]', word):
                filtered_words.append(word)
    
    # 按頻率排序
    word_freq = {}
    for word in filtered_words:
        word_freq[word] = word_freq.get(word, 0) + 1
    
    # 返回頻率最高的3個詞（增加數量以提供更多選擇）
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, freq in sorted_words[:3]]

def generate_multiple_batches(topic, difficulty, count):
    """分批生成大量題目（>5題）"""
    print(f"=== 分批生成 {count} 題 ===")
    
    all_questions = []
    batch_size = 5  # 每批5題
    
    # 計算需要多少批
    num_batches = (count + batch_size - 1) // batch_size  # 向上取整
    
    for batch_num in range(num_batches):
        # 計算當前批次的題目數量
        current_batch_size = min(batch_size, count - batch_num * batch_size)
        
        print(f"=== 生成第 {batch_num + 1}/{num_batches} 批，{current_batch_size} 題 ===")
        
        try:
            # 生成當前批次的題目
            batch_questions = generate_single_batch(topic, difficulty, current_batch_size)
            
            if batch_questions and len(batch_questions) == current_batch_size:
                all_questions.extend(batch_questions)
                print(f"✅ 第 {batch_num + 1} 批生成成功，{len(batch_questions)} 題")
            else:
                print(f"❌ 第 {batch_num + 1} 批生成失敗或數量不符")
                # 如果某批失敗，生成模擬題目填充
                mock_questions = generate_mock_questions(topic, current_batch_size)
                all_questions.extend(mock_questions)
                
        except Exception as e:
            print(f"❌ 第 {batch_num + 1} 批生成異常: {str(e)}")
            # 生成模擬題目填充
            mock_questions = generate_mock_questions(topic, current_batch_size)
            all_questions.extend(mock_questions)
    
    print(f"=== 分批生成完成 ===")
    print(f"總計生成: {len(all_questions)} 題")
    print(f"期望數量: {count} 題")
    
    # 確保返回的題目數量正確
    if len(all_questions) != count:
        print(f"⚠️ 警告：實際生成 {len(all_questions)} 題，期望 {count} 題")
        # 如果數量不足，用模擬題目補充
        while len(all_questions) < count:
            mock_question = generate_mock_questions(topic, 1)[0]
            all_questions.append(mock_question)
        # 如果數量過多，截取到正確數量
        all_questions = all_questions[:count]
    
    return all_questions

if __name__ == "__main__":
    # 從環境變數獲取配置，預設值為開發環境
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    
    print(f"=== ML服務啟動 ===")
    print(f"環境: {'開發' if debug_mode else '生產'}")
    print(f"主機: {host}")
    print(f"端口: {port}")
    print(f"允許的來源: {ALLOWED_ORIGINS}")
    print(f"Django後端URL: {DJANGO_BASE_URL}")
    print(f"前端URL: {FRONTEND_URL}")
    
    # 啟動Flask應用
    app.run(debug=debug_mode, port=port, host=host)

