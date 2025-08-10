# ALX Project Nexus – E-Commerce Backend
## Overview
### ALX Project Nexus is a backend e-commerce application built with Django REST Framework and PostgreSQL, focusing on scalability, security, and performance.
It powers a JavaScript frontend (bee-ecommerce-frontend) through a well-documented REST API.

This project was developed as part of the ProDev Backend Engineering Program, emphasizing real-world backend engineering skills.

## Project Goals
CRUD APIs for products, categories, carts, orders, and users.

Filtering, sorting, and pagination for efficient product discovery.

Secure JWT authentication for user management.

Optimized database schema with indexing.

Interactive API documentation via Swagger.

## Technologies Used
Backend Framework: Django 5 + Django REST Framework

Database: PostgreSQL

Authentication: JWT (djangorestframework-simplejwt)

Filtering: django-filter

API Documentation: Swagger/OpenAPI (drf-yasg)

CORS Management: django-cors-headers

Environment Management: python-dotenv

Frontend: JavaScript (bee-ecommerce-frontend)

## Features
1. User Authentication & Management
JWT-based authentication.

User registration, login, and profile view.

2. Product & Category Management
CRUD operations for products and categories.

Filtering by category.

Sorting by price.

Pagination for large datasets.

3. Cart & Orders
Add/remove products to/from cart.

Place orders.

View order history.

4. API Documentation
Fully interactive Swagger UI & ReDoc.

## Repository Structure
bash
Copy
Edit
project_nexus_backend/
│
├── ecommerce/                 # Main Django application folder
│   ├── settings.py             # Django settings
│   ├── urls.py                 # Project URL configuration
│   ├── wsgi.py                 # WSGI entry point
│
├── products/                   # App handling products & categories
│   ├── models.py               # Product and Category models
│   ├── serializers.py          # DRF serializers
│   ├── views.py                # API views
│   ├── urls.py                 # Product-related API routes
│
├── orders/                     # App handling orders & carts
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│
├── users/                      # Custom user model & auth logic
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│
├── requirements.txt            # Python dependencies
├── manage.py                   # Django management script
├── .env                        # Environment variables
└── README.md                   # Documentation
## Installation & Setup
1. Clone the Repository
bash
Copy
Edit
git clone https://github.com/your-username/project-nexus-backend.git
cd project-nexus-backend
2. Create a Virtual Environment
bash
Copy
Edit
python3 -m venv venv
source venv/bin/activate
3. Install Dependencies
bash
Copy
Edit
pip install -r requirements.txt
4. Configure Environment Variables
Create a .env file in the project root:

ini
Copy
Edit
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_NAME=project_nexus
DATABASE_USER=postgres
DATABASE_PASSWORD=yourpassword
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
5. Run Migrations
bash
Copy
Edit
python manage.py makemigrations
python manage.py migrate
6. Create a Superuser
bash
Copy
Edit
python manage.py createsuperuser
7. Run the Server
bash
Copy
Edit
python manage.py runserver
## API Endpoints
### Authentication
Method	Endpoint	Description	Auth Required
POST	/api/auth/register/	Register new user	❌ No
POST	/api/auth/login/	Login user & get tokens	❌ No
GET	/api/auth/profile/	Get user profile	✅ Yes

### Products
Method	Endpoint	Description	Auth Required
GET	/api/products/	List products	❌ No
POST	/api/products/	Create product	✅ Yes (Admin)
GET	/api/products/{id}/	Get product details	❌ No
PUT	/api/products/{id}/	Update product	✅ Yes (Admin)
DELETE	/api/products/{id}/	Delete product	✅ Yes (Admin)

### Categories
Method	Endpoint	Description	Auth Required
GET	/api/categories/	List categories	❌ No
POST	/api/categories/	Create category	✅ Yes (Admin)
GET	/api/categories/{id}/	Get category details	❌ No
PUT	/api/categories/{id}/	Update category	✅ Yes (Admin)
DELETE	/api/categories/{id}/	Delete category	✅ Yes (Admin)

### Cart
Method	Endpoint	Description	Auth Required
GET	/api/cart/	View cart	✅ Yes
POST	/api/cart/add/	Add product to cart	✅ Yes
POST	/api/cart/remove/	Remove from cart	✅ Yes

### Orders
Method	Endpoint	Description	Auth Required
GET	/api/orders/	List orders	✅ Yes
POST	/api/orders/	Create order	✅ Yes
GET	/api/orders/{id}/	Order details	✅ Yes

## API Documentation
Once the server is running, visit:

Swagger UI: http://localhost:8000/swagger/

ReDoc: http://localhost:8000/redoc/

🔒 Security Considerations
JWT Authentication for secure API access.

Password hashing using Django’s built-in security.

CSRF protection for authenticated requests.

CORS headers for frontend-backend integration.

Environment variables for sensitive configurations.

## Author
Anthony Simiyu Siangu
📧 Email: anthonysimiyu126@gmail.com
🔗 LinkedIn: www.linkedin.com/in/anthony-simiyu
💻 GitHub: github.com/Anthonyreagan

