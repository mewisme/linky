// test.describe('password is compromised', () => {
//   test.beforeEach(async ({ page }) => {
//     await passwordPage.submitPassword(Fixtures.CORRECT_TEST_PASSWORD);
//     await passwordPage.waitUntilHidden();
//   });

//   test('without reset password', async ({ page }) => {
//     const resetPasswordPage = new ResetPasswordPage(page);
//     await expect(resetPasswordPage.resetPasswordButton()).toBeVisible();
//     await expect(resetPasswordPage.breachWarning()).toBeVisible();
//   });

//   test.describe('with reset password', () => {
//     let resetPasswordPage: ResetPasswordPage;
//     let otpPage: OTPPage;

//     test.beforeEach(async ({ page }) => {
//       resetPasswordPage = new ResetPasswordPage(page);
//       otpPage = new OTPPage(page);
//       await resetPasswordPage.submitResetPassword();
//       await resetPasswordPage.waitUntilHidden();
//       await otpPage.waitUntilVisible();
//     });

//     test('without OTP', async ({ page }) => {
//       await otpPage.submitOTP('');
//       await expect(otpPage.errorMessage()).toBeVisible();
//       await expect(otpPage.errorMessage()).toHaveText(
//         'Enter code.'
//       );
//     })

//     test('wrong OTP', async ({ page }) => {
//       await otpPage.fillOTP(Fixtures.WRONG_OTP);
//       await expect(otpPage.errorMessage()).toBeVisible();
//       await expect(otpPage.errorMessage()).toHaveText(
//         'Incorrect code'
//       );
//     })

//     test('expired OTP', async ({ page }) => {
//       // await otpPage.fillOTP(Fixtures.CORRECT_OTP);
//       // TODO: Implement expired OTP
//     })

//     test.describe('correct OTP', () => {
//       let newPasswordPage: NewPasswordPage;
//       test.beforeEach(async ({ page }) => {
//         newPasswordPage = new NewPasswordPage(page);
//         await otpPage.fillOTP(Fixtures.CORRECT_OTP);
//         await newPasswordPage.waitUntilVisible();
//       });

//       test('empty new password', async ({ page }) => {
//         await newPasswordPage.fillNewPassword('');
//         await newPasswordPage.newPasswordInput().blur();
//         await expect(newPasswordPage.newPasswordInput()).toHaveValue('');
//       });

//       test.describe.serial('new password', () => {
//         test('short new password', async ({ page }) => {
//           await newPasswordPage.fillNewPassword(Fixtures.NEW_SHORT_PASSWORD);
//           await newPasswordPage.newPasswordInput().blur();
//           await expect(newPasswordPage.errorNewPasswordMessage()).toBeVisible();
//           await expect(newPasswordPage.errorNewPasswordMessage()).toHaveText(
//             'Your password must contain 8 or more characters.'
//           );
//         });

//         test.describe('password in data breach', () => {
//           test.beforeEach(async ({ page }) => {
//             await newPasswordPage.fillNewPassword(Fixtures.NEW_PASSWORD);
//             await newPasswordPage.newPasswordInput().blur();
//             await expect(newPasswordPage.passwordSuccessFeedback()).toBeVisible();
//             await expect(newPasswordPage.passwordSuccessFeedback()).toHaveText(
//               'Your password meets all the necessary requirements.'
//             );
//           });

//           test('mismatch confirm password', async ({ page }) => {
//             await newPasswordPage.fillConfirmPassword(Fixtures.CONFIRM_PASSWORD_MISMATCH);
//             await newPasswordPage.confirmPasswordInput().blur();
//             await expect(newPasswordPage.errorConfirmPasswordMessage()).toBeVisible();
//             await expect(newPasswordPage.errorConfirmPasswordMessage()).toHaveText(
//               'Passwords don\'t match.'
//             );
//           });

//           test('match confirm password', async ({ page }) => {
//             await newPasswordPage.fillConfirmPassword(Fixtures.CONFIRM_PASSWORD);
//             await newPasswordPage.confirmPasswordInput().blur();
//             await expect(newPasswordPage.confirmPasswordSuccessFeedback()).toBeVisible();
//             await expect(newPasswordPage.confirmPasswordSuccessFeedback()).toHaveText(
//               'Passwords match.'
//             );
//             await newPasswordPage.submitResetPassword();
//             await expect(newPasswordPage.formFeedbackErrorMessage()).toBeVisible();
//             await expect(newPasswordPage.formFeedbackErrorMessage()).toHaveText(
//               /This password has been found as part of a breach/i
//             );
//           });
//         });

//         test('strong new password', async ({ page }) => {
//           await newPasswordPage.fillNewPassword(Fixtures.NEW_STRONG_PASSWORD);
//           await newPasswordPage.newPasswordInput().blur();
//           await expect(newPasswordPage.passwordSuccessFeedback()).toBeVisible();
//           await expect(newPasswordPage.passwordSuccessFeedback()).toHaveText(
//             'Your password meets all the necessary requirements.'
//           );
//           await newPasswordPage.fillConfirmPassword(Fixtures.CONFIRM_STRONG_PASSWORD);
//           await newPasswordPage.confirmPasswordInput().blur();
//           await expect(newPasswordPage.confirmPasswordSuccessFeedback()).toBeVisible();
//           await expect(newPasswordPage.confirmPasswordSuccessFeedback()).toHaveText(
//             'Passwords match.'
//           );
//           await newPasswordPage.submitResetPassword();
//           await page.waitForURL('/');
//           await expect(page.getByTitle('Linky')).toBeVisible();
//         })
//       })
//     })
//   })
// })