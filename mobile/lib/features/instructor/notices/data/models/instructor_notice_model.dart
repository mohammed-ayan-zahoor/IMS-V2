class InstructorNoticeItem {
  final String id;
  final String title;
  final String content;
  final String category;
  final String? authorName;
  final String? createdAt;
  final bool isPinned;

  InstructorNoticeItem({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    this.authorName,
    this.createdAt,
    this.isPinned = false,
  });

  factory InstructorNoticeItem.fromJson(Map<String, dynamic> json) {
    String author = 'Institute';
    if (json['author'] is Map) {
      final first = json['author']['firstName']?.toString() ?? '';
      final last = json['author']['lastName']?.toString() ?? '';
      final full = '$first $last'.trim();
      if (full.isNotEmpty) author = full;
    } else if (json['createdBy'] is Map) {
      final first = json['createdBy']['firstName']?.toString() ?? '';
      if (first.isNotEmpty) author = first;
    }

    return InstructorNoticeItem(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      title: (json['title'] ?? 'Notice').toString(),
      content: (json['content'] ?? json['message'] ?? '').toString(),
      category: (json['category'] ?? 'GENERAL').toString().toUpperCase(),
      authorName: author,
      createdAt: json['createdAt']?.toString() ?? json['date']?.toString(),
      isPinned: json['isPinned'] == true,
    );
  }
}
