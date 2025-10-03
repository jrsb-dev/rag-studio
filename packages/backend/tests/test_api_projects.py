"""Tests for projects API."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    """Test creating a project."""
    response = await client.post(
        "/api/projects",
        json={
            "name": "Test Project",
            "description": "A test project",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Project"
    assert data["description"] == "A test project"
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient):
    """Test listing projects."""
    # Create a project first
    await client.post(
        "/api/projects",
        json={"name": "Test Project 1"},
    )

    # List projects
    response = await client.get("/api/projects")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient):
    """Test getting a specific project."""
    # Create a project
    create_response = await client.post(
        "/api/projects",
        json={"name": "Test Project"},
    )
    project_id = create_response.json()["id"]

    # Get the project
    response = await client.get(f"/api/projects/{project_id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == project_id
    assert data["name"] == "Test Project"


@pytest.mark.asyncio
async def test_get_project_not_found(client: AsyncClient):
    """Test getting a non-existent project."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/projects/{fake_id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient):
    """Test updating a project."""
    # Create a project
    create_response = await client.post(
        "/api/projects",
        json={"name": "Original Name"},
    )
    project_id = create_response.json()["id"]

    # Update the project
    response = await client.patch(
        f"/api/projects/{project_id}",
        json={"name": "Updated Name"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    """Test deleting a project."""
    # Create a project
    create_response = await client.post(
        "/api/projects",
        json={"name": "To Delete"},
    )
    project_id = create_response.json()["id"]

    # Delete the project
    response = await client.delete(f"/api/projects/{project_id}")

    assert response.status_code == 204

    # Verify deletion
    get_response = await client.get(f"/api/projects/{project_id}")
    assert get_response.status_code == 404
