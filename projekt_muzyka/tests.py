from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from projekt_muzyka.models import UserProfile

class MusicQuizAuthTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(username="testuser", password="testpassword123")
        # Profile is automatically created by signal, let's update its display_name
        self.profile = self.user.profile
        self.profile.display_name = "Test User"
        self.profile.save()
        
        # Create a second user for uniqueness testing
        self.other_user = User.objects.create_user(username="otheruser", password="otherpassword123")
        
    def test_user_registration(self):
        url = reverse("auth-register")
        data = {"username": "newuser", "password": "newpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_user_registration_duplicate(self):
        url = reverse("auth-register")
        data = {"username": "testuser", "password": "newpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login(self):
        url = reverse("auth-login")
        data = {"username": "testuser", "password": "testpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_login_invalid(self):
        url = reverse("auth-login")
        data = {"username": "testuser", "password": "wrongpassword"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_profile(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"], "testuser")
        self.assertEqual(response.data["display_name"], "Test User")

    def test_update_profile_display_name(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        data = {"display_name": "New Display Name"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.display_name, "New Display Name")

    def test_update_profile_username(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        data = {"username": "newusername"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "newusername")

    def test_update_profile_username_duplicate(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("profile")
        data = {"username": "otheruser"}
        response = self.client.put(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "testuser") # Unchanged

    def test_change_password(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-change-password")
        data = {"old_password": "testpassword123", "new_password": "newsecurepassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newsecurepassword123"))

    def test_change_password_invalid_old(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-change-password")
        data = {"old_password": "wrongoldpassword", "new_password": "newsecurepassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.check_password("newsecurepassword123"))

    def test_delete_account(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-delete-account")
        data = {"password": "testpassword123"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(username="testuser").exists())
        self.assertFalse(UserProfile.objects.filter(user__username="testuser").exists())

    def test_delete_account_wrong_password(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("auth-delete-account")
        data = {"password": "wrongpassword"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(username="testuser").exists())
