import 'package:flutter/material.dart';
import 'ui/chat_modal.dart';

void main() {
  runApp(const SimpleFinanceApp());
}

class SimpleFinanceApp extends StatelessWidget {
  const SimpleFinanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Simple Finance',
      theme: ThemeData.dark(),
      home: const ChatModal(),
    );
  }
}
