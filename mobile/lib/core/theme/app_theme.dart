import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryBlue = Color(0xFF0F172A); // Dark slate
  static const Color premiumBlue = Color(0xFF2563EB); // Vibrant blue
  static const Color emeraldGreen = Color(0xFF10B981); // Success/attendance
  static const Color amberOrange = Color(0xFFF59E0B); // Warnings/notices
  static const Color bgGray = Color(0xFFF8F9FA); // Very light gray background
  
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: bgGray,
      colorScheme: ColorScheme.fromSeed(
        seedColor: premiumBlue,
        primary: premiumBlue,
        secondary: emeraldGreen,
        surface: Colors.white,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xFFF1F5F9)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: primaryBlue,
          fontSize: 16,
          fontWeight: FontWeight.w900,
        ),
        iconTheme: IconThemeData(color: primaryBlue),
      ),
    );
  }
}
