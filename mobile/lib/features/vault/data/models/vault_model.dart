class KycDocumentModel {
  final String id;
  final String name;
  final String url;
  final String publicId;
  final String category; // 'Aadhar', 'Photo', 'Marksheet', 'Certificate', etc.
  final DateTime uploadedAt;

  KycDocumentModel({
    required this.id,
    required this.name,
    required this.url,
    required this.publicId,
    required this.category,
    required this.uploadedAt,
  });

  factory KycDocumentModel.fromJson(Map<String, dynamic> json) {
    return KycDocumentModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? 'Document',
      url: json['url'] ?? '',
      publicId: json['publicId'] ?? '',
      category: json['category'] ?? 'Other',
      uploadedAt: json['uploadedAt'] != null ? DateTime.parse(json['uploadedAt']) : DateTime.now(),
    );
  }
}

class CertificateModel {
  final String id;
  final String certificateNumber;
  final String templateType;
  final DateTime issueDate;
  final String courseName;
  final String duration;
  final String grade;
  final String pdfUrl;
  final String status;

  CertificateModel({
    required this.id,
    required this.certificateNumber,
    required this.templateType,
    required this.issueDate,
    required this.courseName,
    required this.duration,
    required this.grade,
    required this.pdfUrl,
    required this.status,
  });

  factory CertificateModel.fromJson(Map<String, dynamic> json) {
    final meta = json['metadata'] as Map<String, dynamic>? ?? {};

    return CertificateModel(
      id: json['_id'] ?? json['id'] ?? '',
      certificateNumber: json['certificateNumber'] ?? 'CERT-000',
      templateType: json['templateType'] ?? 'STANDARD',
      issueDate: json['issueDate'] != null ? DateTime.parse(json['issueDate']) : DateTime.now(),
      courseName: meta['courseName'] ?? 'Course Completion',
      duration: meta['duration'] ?? '',
      grade: meta['grade'] ?? 'Pass',
      pdfUrl: json['pdfUrl'] ?? '',
      status: json['status'] ?? 'ISSUED',
    );
  }
}

class VaultDataModel {
  final List<KycDocumentModel> kyc;
  final List<CertificateModel> certificates;
  final String instituteId;

  VaultDataModel({
    required this.kyc,
    required this.certificates,
    required this.instituteId,
  });

  factory VaultDataModel.fromJson(Map<String, dynamic> json) {
    final kycList = (json['kyc'] as List<dynamic>?)?.map((e) => KycDocumentModel.fromJson(e)).toList() ?? [];
    final certList = (json['certificates'] as List<dynamic>?)?.map((e) => CertificateModel.fromJson(e)).toList() ?? [];

    return VaultDataModel(
      kyc: kycList,
      certificates: certList,
      instituteId: json['instituteId'] ?? '',
    );
  }
}
