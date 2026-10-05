class SyllabusCompletion {
  final String itemId;
  final String itemType; // 'chapter', 'topic', 'subtopic'
  final String chapterId;
  final String? topicId;
  final bool isCompleted;
  final DateTime? completedAt;
  final String? notes;

  SyllabusCompletion({
    required this.itemId,
    required this.itemType,
    required this.chapterId,
    this.topicId,
    required this.isCompleted,
    this.completedAt,
    this.notes,
  });

  factory SyllabusCompletion.fromJson(Map<String, dynamic> json) {
    DateTime? date;
    if (json['completedAt'] != null) {
      date = DateTime.tryParse(json['completedAt'].toString());
    }
    return SyllabusCompletion(
      itemId: (json['itemId'] ?? '').toString(),
      itemType: json['itemType']?.toString() ?? 'topic',
      chapterId: (json['chapterId'] ?? '').toString(),
      topicId: json['topicId']?.toString(),
      isCompleted: json['isCompleted'] == true,
      completedAt: date,
      notes: json['notes']?.toString(),
    );
  }
}

class BatchSyllabusProgress {
  final String id;
  final String batchId;
  final String subjectId;
  final double overallProgress;
  final DateTime? lastActivityAt;
  final Map<String, SyllabusCompletion> completions;

  BatchSyllabusProgress({
    required this.id,
    required this.batchId,
    required this.subjectId,
    required this.overallProgress,
    this.lastActivityAt,
    required this.completions,
  });

  bool isItemCompleted(String itemId) {
    final record = completions[itemId];
    return record != null && record.isCompleted;
  }

  SyllabusCompletion? findCompletion(String itemId) {
    return completions[itemId];
  }

  factory BatchSyllabusProgress.fromJson(Map<String, dynamic> json) {
    final Map<String, SyllabusCompletion> compMap = {};
    if (json['completions'] is List) {
      for (final item in (json['completions'] as List)) {
        if (item is Map<String, dynamic>) {
          final c = SyllabusCompletion.fromJson(item);
          if (c.itemId.isNotEmpty) {
            compMap[c.itemId] = c;
          }
        }
      }
    }

    double progress = 0;
    if (json['overallProgress'] is num) {
      progress = (json['overallProgress'] as num).toDouble();
    }

    DateTime? lastAct;
    if (json['lastActivityAt'] != null) {
      lastAct = DateTime.tryParse(json['lastActivityAt'].toString());
    }

    return BatchSyllabusProgress(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      batchId: (json['batch'] is Map ? json['batch']['_id'] : json['batch'])?.toString() ?? '',
      subjectId: (json['subject'] is Map ? json['subject']['_id'] : json['subject'])?.toString() ?? '',
      overallProgress: progress,
      lastActivityAt: lastAct,
      completions: compMap,
    );
  }
}
