class SyllabusSubTopic {
  String? id;
  String title;
  int order;

  SyllabusSubTopic({
    this.id,
    required this.title,
    this.order = 0,
  });

  factory SyllabusSubTopic.fromJson(Map<String, dynamic> json) {
    return SyllabusSubTopic(
      id: (json['_id'] ?? json['id'])?.toString(),
      title: json['title']?.toString() ?? '',
      order: (json['order'] is num) ? (json['order'] as num).toInt() : 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null && !id!.startsWith('tmp_')) '_id': id,
      'title': title,
      'order': order,
    };
  }
}

class SyllabusTopic {
  String? id;
  String title;
  int order;
  List<SyllabusSubTopic> subTopics;

  SyllabusTopic({
    this.id,
    required this.title,
    this.order = 0,
    List<SyllabusSubTopic>? subTopics,
  }) : subTopics = subTopics ?? [];

  factory SyllabusTopic.fromJson(Map<String, dynamic> json) {
    return SyllabusTopic(
      id: (json['_id'] ?? json['id'])?.toString(),
      title: json['title']?.toString() ?? '',
      order: (json['order'] is num) ? (json['order'] as num).toInt() : 0,
      subTopics: (json['subTopics'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map((st) => SyllabusSubTopic.fromJson(st))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null && !id!.startsWith('tmp_')) '_id': id,
      'title': title,
      'order': order,
      'subTopics': subTopics.map((st) => st.toJson()).toList(),
    };
  }
}

class SyllabusChapter {
  String? id;
  String title;
  int order;
  List<SyllabusTopic> topics;

  SyllabusChapter({
    this.id,
    required this.title,
    this.order = 0,
    List<SyllabusTopic>? topics,
  }) : topics = topics ?? [];

  factory SyllabusChapter.fromJson(Map<String, dynamic> json) {
    return SyllabusChapter(
      id: (json['_id'] ?? json['id'])?.toString(),
      title: json['title']?.toString() ?? '',
      order: (json['order'] is num) ? (json['order'] as num).toInt() : 0,
      topics: (json['topics'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map((t) => SyllabusTopic.fromJson(t))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null && !id!.startsWith('tmp_')) '_id': id,
      'title': title,
      'order': order,
      'topics': topics.map((t) => t.toJson()).toList(),
    };
  }
}

class SyllabusSubject {
  final String id;
  final String name;
  final String code;
  final String? courseId;
  final String? courseName;

  SyllabusSubject({
    required this.id,
    required this.name,
    required this.code,
    this.courseId,
    this.courseName,
  });

  factory SyllabusSubject.fromJson(Map<String, dynamic> json) {
    String? cId;
    String? cName;
    if (json['course'] is Map) {
      cId = (json['course']['_id'] ?? json['course']['id'])?.toString();
      cName = json['course']['name']?.toString();
    } else if (json['course'] is String) {
      cId = json['course'].toString();
    }
    return SyllabusSubject(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: json['name']?.toString() ?? 'Untitled Subject',
      code: json['code']?.toString() ?? '',
      courseId: cId,
      courseName: cName,
    );
  }
}
