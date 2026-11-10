import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_kn.dart';
import 'app_localizations_mr.dart';
import 'app_localizations_ta.dart';
import 'app_localizations_te.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('kn'),
    Locale('mr'),
    Locale('ta'),
    Locale('te'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Quantech Portal'**
  String get appName;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome Back'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to access your portal'**
  String get loginSubtitle;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email Address'**
  String get emailLabel;

  /// No description provided for @emailHint.
  ///
  /// In en, this message translates to:
  /// **'Enter your institute email'**
  String get emailHint;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @passwordHint.
  ///
  /// In en, this message translates to:
  /// **'Enter your password'**
  String get passwordHint;

  /// No description provided for @signInButton.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get signInButton;

  /// No description provided for @signingIn.
  ///
  /// In en, this message translates to:
  /// **'Signing in...'**
  String get signingIn;

  /// No description provided for @selectLanguage.
  ///
  /// In en, this message translates to:
  /// **'Select Language'**
  String get selectLanguage;

  /// No description provided for @changeLanguage.
  ///
  /// In en, this message translates to:
  /// **'Change Language'**
  String get changeLanguage;

  /// No description provided for @homeTab.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get homeTab;

  /// No description provided for @attendanceTab.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendanceTab;

  /// No description provided for @batchesTab.
  ///
  /// In en, this message translates to:
  /// **'Batches'**
  String get batchesTab;

  /// No description provided for @profileTab.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileTab;

  /// No description provided for @moreTab.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get moreTab;

  /// No description provided for @dashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Teacher Dashboard'**
  String get dashboardTitle;

  /// No description provided for @assignedBatches.
  ///
  /// In en, this message translates to:
  /// **'Assigned Batches'**
  String get assignedBatches;

  /// No description provided for @totalStudents.
  ///
  /// In en, this message translates to:
  /// **'Total Students'**
  String get totalStudents;

  /// No description provided for @activeSession.
  ///
  /// In en, this message translates to:
  /// **'Active Session'**
  String get activeSession;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick Actions'**
  String get quickActions;

  /// No description provided for @markAttendance.
  ///
  /// In en, this message translates to:
  /// **'Mark Attendance'**
  String get markAttendance;

  /// No description provided for @postNotice.
  ///
  /// In en, this message translates to:
  /// **'Post Notice'**
  String get postNotice;

  /// No description provided for @studyMaterials.
  ///
  /// In en, this message translates to:
  /// **'Study Materials'**
  String get studyMaterials;

  /// No description provided for @myBatches.
  ///
  /// In en, this message translates to:
  /// **'My Batches'**
  String get myBatches;

  /// No description provided for @saveAttendance.
  ///
  /// In en, this message translates to:
  /// **'Save Attendance'**
  String get saveAttendance;

  /// No description provided for @markAllPresent.
  ///
  /// In en, this message translates to:
  /// **'Mark All Present'**
  String get markAllPresent;

  /// No description provided for @present.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get present;

  /// No description provided for @absent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get absent;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @unmarked.
  ///
  /// In en, this message translates to:
  /// **'Unmarked'**
  String get unmarked;

  /// No description provided for @searchStudentHint.
  ///
  /// In en, this message translates to:
  /// **'Search student by name or roll...'**
  String get searchStudentHint;

  /// No description provided for @searchBatchesHint.
  ///
  /// In en, this message translates to:
  /// **'Search batches or courses...'**
  String get searchBatchesHint;

  /// No description provided for @searchMaterialsHint.
  ///
  /// In en, this message translates to:
  /// **'Search study materials...'**
  String get searchMaterialsHint;

  /// No description provided for @uploadNotes.
  ///
  /// In en, this message translates to:
  /// **'Upload Material'**
  String get uploadNotes;

  /// No description provided for @uploadMaterial.
  ///
  /// In en, this message translates to:
  /// **'Upload Material'**
  String get uploadMaterial;

  /// No description provided for @materialTitle.
  ///
  /// In en, this message translates to:
  /// **'Material Title'**
  String get materialTitle;

  /// No description provided for @fileUrl.
  ///
  /// In en, this message translates to:
  /// **'File / Drive URL'**
  String get fileUrl;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description (Optional)'**
  String get description;

  /// No description provided for @noticesTitle.
  ///
  /// In en, this message translates to:
  /// **'Notices & Announcements'**
  String get noticesTitle;

  /// No description provided for @noticeCategoryGeneral.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get noticeCategoryGeneral;

  /// No description provided for @noticeCategoryExam.
  ///
  /// In en, this message translates to:
  /// **'Exam'**
  String get noticeCategoryExam;

  /// No description provided for @noticeCategoryHoliday.
  ///
  /// In en, this message translates to:
  /// **'Holiday'**
  String get noticeCategoryHoliday;

  /// No description provided for @noticeCategoryUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get noticeCategoryUrgent;

  /// No description provided for @publishNotice.
  ///
  /// In en, this message translates to:
  /// **'Publish Notice'**
  String get publishNotice;

  /// No description provided for @noticeTitle.
  ///
  /// In en, this message translates to:
  /// **'Notice Title'**
  String get noticeTitle;

  /// No description provided for @noticeMessage.
  ///
  /// In en, this message translates to:
  /// **'Message Content'**
  String get noticeMessage;

  /// No description provided for @calendarTitle.
  ///
  /// In en, this message translates to:
  /// **'School Calendar'**
  String get calendarTitle;

  /// No description provided for @leaveRequestsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Leave Requests'**
  String get leaveRequestsTitle;

  /// No description provided for @applyLeave.
  ///
  /// In en, this message translates to:
  /// **'Apply Leave'**
  String get applyLeave;

  /// No description provided for @leaveType.
  ///
  /// In en, this message translates to:
  /// **'Leave Type'**
  String get leaveType;

  /// No description provided for @startDate.
  ///
  /// In en, this message translates to:
  /// **'Start Date'**
  String get startDate;

  /// No description provided for @endDate.
  ///
  /// In en, this message translates to:
  /// **'End Date'**
  String get endDate;

  /// No description provided for @reason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get reason;

  /// No description provided for @submitApplication.
  ///
  /// In en, this message translates to:
  /// **'Submit Application'**
  String get submitApplication;

  /// No description provided for @statusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get statusPending;

  /// No description provided for @statusApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get statusApproved;

  /// No description provided for @statusRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get statusRejected;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get statusCancelled;

  /// No description provided for @cancelLeave.
  ///
  /// In en, this message translates to:
  /// **'Cancel Leave'**
  String get cancelLeave;

  /// No description provided for @examsTitle.
  ///
  /// In en, this message translates to:
  /// **'Exams & Grading'**
  String get examsTitle;

  /// No description provided for @questionBankTitle.
  ///
  /// In en, this message translates to:
  /// **'Question Bank'**
  String get questionBankTitle;

  /// No description provided for @submissions.
  ///
  /// In en, this message translates to:
  /// **'Submissions'**
  String get submissions;

  /// No description provided for @gradeSubmissions.
  ///
  /// In en, this message translates to:
  /// **'Grade Submissions'**
  String get gradeSubmissions;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @emptyState.
  ///
  /// In en, this message translates to:
  /// **'No records found'**
  String get emptyState;

  /// No description provided for @networkError.
  ///
  /// In en, this message translates to:
  /// **'Network error. Please try again.'**
  String get networkError;

  /// No description provided for @studentPortal.
  ///
  /// In en, this message translates to:
  /// **'Student Portal'**
  String get studentPortal;

  /// No description provided for @timetable.
  ///
  /// In en, this message translates to:
  /// **'Timetable'**
  String get timetable;

  /// No description provided for @fees.
  ///
  /// In en, this message translates to:
  /// **'Fees & Payments'**
  String get fees;

  /// No description provided for @feesRecords.
  ///
  /// In en, this message translates to:
  /// **'Fee Records'**
  String get feesRecords;

  /// No description provided for @materials.
  ///
  /// In en, this message translates to:
  /// **'Learning Materials'**
  String get materials;

  /// No description provided for @syllabus.
  ///
  /// In en, this message translates to:
  /// **'Syllabus'**
  String get syllabus;

  /// No description provided for @practiceTests.
  ///
  /// In en, this message translates to:
  /// **'Practice Tests'**
  String get practiceTests;

  /// No description provided for @campusMessages.
  ///
  /// In en, this message translates to:
  /// **'Campus Messages'**
  String get campusMessages;

  /// No description provided for @documentVault.
  ///
  /// In en, this message translates to:
  /// **'Document Vault'**
  String get documentVault;

  /// No description provided for @academicSessions.
  ///
  /// In en, this message translates to:
  /// **'Academic Sessions'**
  String get academicSessions;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @digitalId.
  ///
  /// In en, this message translates to:
  /// **'Digital ID'**
  String get digitalId;

  /// No description provided for @helpAndSupport.
  ///
  /// In en, this message translates to:
  /// **'Help & Support'**
  String get helpAndSupport;

  /// No description provided for @personalDetails.
  ///
  /// In en, this message translates to:
  /// **'Personal Details'**
  String get personalDetails;

  /// No description provided for @settingsAndPreferences.
  ///
  /// In en, this message translates to:
  /// **'Settings & Preferences'**
  String get settingsAndPreferences;

  /// No description provided for @currentSession.
  ///
  /// In en, this message translates to:
  /// **'Current Session'**
  String get currentSession;

  /// No description provided for @archived.
  ///
  /// In en, this message translates to:
  /// **'Archived'**
  String get archived;

  /// No description provided for @allClear.
  ///
  /// In en, this message translates to:
  /// **'All Clear'**
  String get allClear;

  /// No description provided for @noDues.
  ///
  /// In en, this message translates to:
  /// **'No Dues'**
  String get noDues;

  /// No description provided for @due.
  ///
  /// In en, this message translates to:
  /// **'Due'**
  String get due;

  /// No description provided for @totalDue.
  ///
  /// In en, this message translates to:
  /// **'Total Due'**
  String get totalDue;

  /// No description provided for @paid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get paid;

  /// No description provided for @pending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pending;

  /// No description provided for @general.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get general;

  /// No description provided for @profileSection.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profileSection;

  /// No description provided for @feesAndPayments.
  ///
  /// In en, this message translates to:
  /// **'Fees & Payments'**
  String get feesAndPayments;

  /// No description provided for @assessmentsAndExams.
  ///
  /// In en, this message translates to:
  /// **'Assessments & Sem Exams'**
  String get assessmentsAndExams;

  /// No description provided for @semesterResources.
  ///
  /// In en, this message translates to:
  /// **'Semester Resources'**
  String get semesterResources;

  /// No description provided for @studyMaterialsAndNotes.
  ///
  /// In en, this message translates to:
  /// **'Study Materials & Notes'**
  String get studyMaterialsAndNotes;

  /// No description provided for @testsAndPreparatory.
  ///
  /// In en, this message translates to:
  /// **'Tests & Preparatory Exams'**
  String get testsAndPreparatory;

  /// No description provided for @digitalLibraryCard.
  ///
  /// In en, this message translates to:
  /// **'Digital Library Card'**
  String get digitalLibraryCard;

  /// No description provided for @practiceAndQuizzes.
  ///
  /// In en, this message translates to:
  /// **'Practice & Quizzes'**
  String get practiceAndQuizzes;

  /// No description provided for @noticesAndCirculars.
  ///
  /// In en, this message translates to:
  /// **'Notices & Circulars'**
  String get noticesAndCirculars;

  /// No description provided for @academicTimeline.
  ///
  /// In en, this message translates to:
  /// **'Academic Timeline'**
  String get academicTimeline;

  /// No description provided for @studentProfileDetails.
  ///
  /// In en, this message translates to:
  /// **'Student Profile & Details'**
  String get studentProfileDetails;

  /// No description provided for @signOutConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOutConfirmTitle;

  /// No description provided for @signOutConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out of your student account?'**
  String get signOutConfirmMessage;

  /// No description provided for @studentSupport.
  ///
  /// In en, this message translates to:
  /// **'Student Support'**
  String get studentSupport;

  /// No description provided for @campusCode.
  ///
  /// In en, this message translates to:
  /// **'Campus Code'**
  String get campusCode;

  /// No description provided for @supportContactPrompt.
  ///
  /// In en, this message translates to:
  /// **'Need assistance with courses, exams, or fee receipts? Please reach out to your institute administration or advisor.'**
  String get supportContactPrompt;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @degreeScholarSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Degree Scholar • Higher Education'**
  String get degreeScholarSubtitle;

  /// No description provided for @puScholarSubtitle.
  ///
  /// In en, this message translates to:
  /// **'PU Scholar • Pre-University'**
  String get puScholarSubtitle;

  /// No description provided for @schoolScholarSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Active Student • Learning & Growing'**
  String get schoolScholarSubtitle;

  /// No description provided for @semester.
  ///
  /// In en, this message translates to:
  /// **'Semester'**
  String get semester;

  /// No description provided for @sem.
  ///
  /// In en, this message translates to:
  /// **'Sem'**
  String get sem;

  /// No description provided for @oddSemester.
  ///
  /// In en, this message translates to:
  /// **'Odd Semester'**
  String get oddSemester;

  /// No description provided for @evenSemester.
  ///
  /// In en, this message translates to:
  /// **'Even Semester'**
  String get evenSemester;

  /// No description provided for @switchSession.
  ///
  /// In en, this message translates to:
  /// **'Switch'**
  String get switchSession;

  /// No description provided for @selectSession.
  ///
  /// In en, this message translates to:
  /// **'Select Academic Session'**
  String get selectSession;

  /// No description provided for @archivedCompleted.
  ///
  /// In en, this message translates to:
  /// **'Archived / Completed'**
  String get archivedCompleted;

  /// No description provided for @currentEnrolledSession.
  ///
  /// In en, this message translates to:
  /// **'Current Enrolled Session'**
  String get currentEnrolledSession;

  /// No description provided for @previousSessions.
  ///
  /// In en, this message translates to:
  /// **'Previous Sessions'**
  String get previousSessions;

  /// No description provided for @readOnly.
  ///
  /// In en, this message translates to:
  /// **'Read-only'**
  String get readOnly;

  /// No description provided for @showingArchivedRecords.
  ///
  /// In en, this message translates to:
  /// **'Showing archived records (Read-only)'**
  String get showingArchivedRecords;

  /// No description provided for @pucYear1.
  ///
  /// In en, this message translates to:
  /// **'1st Year PUC'**
  String get pucYear1;

  /// No description provided for @pucYear2.
  ///
  /// In en, this message translates to:
  /// **'2nd Year PUC'**
  String get pucYear2;

  /// No description provided for @viewOriginal.
  ///
  /// In en, this message translates to:
  /// **'View Original (English)'**
  String get viewOriginal;

  /// No description provided for @viewTranslated.
  ///
  /// In en, this message translates to:
  /// **'Translate Notice'**
  String get viewTranslated;

  /// No description provided for @translatedNotice.
  ///
  /// In en, this message translates to:
  /// **'Translated Notice'**
  String get translatedNotice;

  /// No description provided for @originalLanguageNotice.
  ///
  /// In en, this message translates to:
  /// **'Original English'**
  String get originalLanguageNotice;

  /// No description provided for @changePhoto.
  ///
  /// In en, this message translates to:
  /// **'Change Profile Photo'**
  String get changePhoto;

  /// No description provided for @uploadNewPhoto.
  ///
  /// In en, this message translates to:
  /// **'Upload New Photo'**
  String get uploadNewPhoto;

  /// No description provided for @viewFullPhoto.
  ///
  /// In en, this message translates to:
  /// **'View Photo'**
  String get viewFullPhoto;

  /// No description provided for @photoUpdateSuccess.
  ///
  /// In en, this message translates to:
  /// **'Profile photo updated successfully!'**
  String get photoUpdateSuccess;

  /// No description provided for @photoUpdateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to upload photo. Please try again.'**
  String get photoUpdateFailed;

  /// No description provided for @removePhoto.
  ///
  /// In en, this message translates to:
  /// **'Remove Photo'**
  String get removePhoto;

  /// No description provided for @removePhotoConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Remove Profile Photo?'**
  String get removePhotoConfirmTitle;

  /// No description provided for @removePhotoConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to remove your profile photo?'**
  String get removePhotoConfirmMessage;

  /// No description provided for @photoRemovedSuccess.
  ///
  /// In en, this message translates to:
  /// **'Profile photo removed successfully.'**
  String get photoRemovedSuccess;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
    'en',
    'hi',
    'kn',
    'mr',
    'ta',
    'te',
  ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
    case 'kn':
      return AppLocalizationsKn();
    case 'mr':
      return AppLocalizationsMr();
    case 'ta':
      return AppLocalizationsTa();
    case 'te':
      return AppLocalizationsTe();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
