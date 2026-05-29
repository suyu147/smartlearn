import requests
import json
import time
import hashlib
import base64
import hmac

# ===================== 配置信息（请替换成你自己的）=====================
APP_ID = "你的APPID"
API_SECRET = "你的APISecret"
API_KEY = "npbUtzcAyCeKbfdcyuVW:GjKpoeyDSVVkTUdYNROW"
# =====================================================================

# 讯飞 Lite 模型 HTTP 接口地址（v1.1 版本）
URL = "https://spark-api-open.xf-yun.com/v1/chat/completions"


def get_authorization(API_KEY, API_SECRET):
    """
    生成讯飞接口 required 的 Authorization 签名
    """
    # 1. 获取时间戳
    timestamp = str(int(time.time()))
    # 2. 拼接签名原文字符串
    signature_origin = f"host: spark-api-open.xf-yun.com\ndate: {timestamp}\nGET /v1/chat/completions HTTP/1.1"
    # 3. HMAC-SHA256 加密
    signature_sha = hmac.new(API_SECRET.encode('utf-8'), signature_origin.encode('utf-8'),
                             digestmod=hashlib.sha256).digest()
    signature = base64.b64encode(signature_sha).decode('utf-8')
    # 4. 拼接 Authorization
    authorization_origin = f'api_key="{API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'
    authorization = base64.b64encode(authorization_origin.encode('utf-8')).decode('utf-8')
    return authorization, timestamp


def chat_with_xunfei_lite(message):
    """
    调用讯飞 Lite 模型对话
    :param message: 用户输入的对话内容
    :return: 模型返回的回答文本
    """
    # 获取签名和时间戳
    authorization, timestamp = get_authorization(API_KEY, API_SECRET)

    # 请求头
    headers = {
        "Authorization": authorization,
        "Content-Type": "application/json",
        "Host": "spark-api-open.xf-yun.com",
        "Date": timestamp
    }

    # 请求体（Lite 模型对应 domain: general ）
    data = {
        "header": {
            "app_id": APP_ID
        },
        "parameter": {
            "chat": {
                "domain": "general",  # Lite 模型固定填 general
                "temperature": 0.5,  # 随机性 0-1
                "max_tokens": 2048  # 最大响应长度
            }
        },
        "payload": {
            "message": {
                "text": [
                    {"role": "user", "content": message}
                ]
            }
        }
    }

    # 发送 POST 请求
    response = requests.post(URL, headers=headers, json=data)

    # 解析返回结果
    if response.status_code == 200:
        result = response.json()
        # 提取回答内容
        if result.get("payload") and result["payload"].get("choices"):
            answer = result["payload"]["choices"]["text"][0]["content"]
            return answer
        else:
            return "模型返回结果异常：" + str(result)
    else:
        return f"请求失败，状态码：{response.status_code}，返回内容：{response.text}"


# 测试调用
if __name__ == "__main__":
    print("===== 讯飞 Lite 模型对话（HTTP 调用）=====")
    while True:
        user_input = input("你：")
        if user_input.lower() in ["exit", "quit", "退出"]:
            print("对话结束")
            break
        answer = chat_with_xunfei_lite(user_input)
        print(f"讯飞 Lite：{answer}\n")