import 'package:flutter/material.dart';
import 'package:student_app/features/vault/data/models/vault_model.dart';
import 'package:student_app/features/vault/data/repositories/vault_repository.dart';

class VaultProvider extends ChangeNotifier {
  final VaultRepository _repository = VaultRepository();

  bool _isLoading = false;
  String? _errorMessage;
  VaultDataModel? _vaultData;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  VaultDataModel? get vaultData => _vaultData;

  List<KycDocumentModel> get kycDocuments => _vaultData?.kyc ?? [];
  List<CertificateModel> get certificates => _vaultData?.certificates ?? [];

  VaultProvider() {
    loadDocuments();
  }

  Future<void> loadDocuments({bool refresh = false}) async {
    if (_vaultData != null && !refresh) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _vaultData = await _repository.fetchStudentDocuments();
    } catch (e) {
      _errorMessage = 'Failed to load document vault.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
