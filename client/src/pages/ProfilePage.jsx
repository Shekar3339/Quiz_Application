import { useAuth } from '../context/AuthContext.jsx';

function ProfilePage() {
  const { user } = useAuth();

  return (
    <section className="page-section mx-auto">
      <div className="mb-4">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1 className="h2 fw-bold mt-2 mb-1">Profile</h1>
        <p className="text-secondary mb-0">Your account information.</p>
      </div>
      <div className="card border-0 shadow-sm profile-card">
        <div className="card-body p-4 p-md-5">
          <div className="profile-avatar mb-3" aria-hidden="true">
            {user.name.trim().charAt(0).toUpperCase()}
          </div>
          <h2 className="h4 fw-bold">{user.name}</h2>
          <dl className="row mb-0 mt-4">
            <dt className="col-sm-4 text-secondary">Name</dt>
            <dd className="col-sm-8">{user.name}</dd>
            <dt className="col-sm-4 text-secondary">Email</dt>
            <dd className="col-sm-8">{user.email}</dd>
            <dt className="col-sm-4 text-secondary">Member since</dt>
            <dd className="col-sm-8">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </dd>
          </dl>
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
