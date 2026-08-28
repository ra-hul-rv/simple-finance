import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiClient {
  static const String baseUrl = 'https://finance.rvcloud.in'; // adjust if needed

  static Future<String> sendLlmQuery(String prompt) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/llm-query'),
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if required
      },
      body: jsonEncode({'prompt': prompt}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['response'] ?? '';
    } else {
      throw Exception('LLM query failed: ${response.statusCode}');
    }
  }

  // Example: create transaction using existing backend endpoint
  static Future<void> createTransaction(Map<String, dynamic> txn) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/transactions'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(txn),
    );
    if (response.statusCode != 201) {
      throw Exception('Create transaction failed: ${response.statusCode}');
    }
  }
}
