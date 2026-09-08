import fitz
import urllib.request
import json

def run_live_test():
    # 1. Create a sample research PDF in memory
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (50, 72),
        "Attention Is All You Need\n\n"
        "Abstract: The dominant sequence transduction models are based on complex recurrent or "
        "convolutional neural networks in an encoder-decoder configuration. We propose the Transformer, "
        "a model architecture eschewing recurrence and entirely relying on an attention mechanism to draw "
        "global dependencies between input and output."
    )
    pdf_bytes = doc.tobytes()

    # 2. Upload via multipart/form-data
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    part_head = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="sample_transformer.pdf"\r\n'
        "Content-Type: application/pdf\r\n\r\n"
    ).encode("utf-8")
    part_tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    body = part_head + pdf_bytes + part_tail

    req = urllib.request.Request("http://127.0.0.1:8000/api/documents/upload", data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    
    with urllib.request.urlopen(req) as resp:
        upload_res = json.loads(resp.read().decode())
    
    print("SUCCESS: Ingestion completed! Doc ID:", upload_res["doc_id"])
    print("Filename:", upload_res["filename"])
    print("Pages:", upload_res["total_pages"], "Chunks:", upload_res["total_chunks"])

    # 3. Query the chat endpoint
    query_payload = json.dumps({
        "query": "What does the Transformer architecture rely on according to the abstract?",
        "conversation_history": []
    }).encode("utf-8")

    chat_req = urllib.request.Request(
        "http://127.0.0.1:8000/api/chat",
        data=query_payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(chat_req) as resp:
        chat_res = json.loads(resp.read().decode())

    print("\nSUCCESS: Reasoning Graph Completed!")
    print("Synthesized Answer:\n", chat_res["answer"])
    print("\nReasoning Steps (LangGraph):", len(chat_res["reasoning_steps"]))
    for s in chat_res["reasoning_steps"]:
        print("  *", s)
    print("\nExtracted Citations:", len(chat_res["citations"]))
    for c in chat_res["citations"]:
        print("  -", c.get("document_title", "Doc"), f"p. {c.get('page_number', 1)}", f"(Verified: {c.get('is_verified', True)})")
    
    print("\nFaithfulness Score:", chat_res.get("faithfulness_score"))
    print("Execution Time:", round(chat_res.get("execution_time_ms", 0), 2), "ms")

if __name__ == "__main__":
    run_live_test()
