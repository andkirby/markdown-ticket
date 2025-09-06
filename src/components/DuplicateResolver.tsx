import React, { useState, useEffect } from 'react';

interface Duplicate {
  code: string;
  tickets: Array<{
    filename: string;
    filepath: string;
    title: string;
    code: string;
  }>;
}

interface DuplicateResolverProps {
  projectId: string;
  onResolved: () => void;
}

interface PreviewInfo {
  newCode: string;
  newFilename: string;
}

export const DuplicateResolver: React.FC<DuplicateResolverProps> = ({ projectId, onResolved }) => {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{
    action: 'rename' | 'delete';
    filepath: string;
    filename: string;
    preview?: PreviewInfo;
  } | null>(null);

  useEffect(() => {
    loadDuplicates();
  }, [projectId]);

  const loadDuplicates = async () => {
    try {
      const response = await fetch(`/api/duplicates/${projectId}`);
      const data = await response.json();
      setDuplicates(data.duplicates || []);
    } catch (error) {
      console.error('Failed to load duplicates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewInfo = async (filepath: string): Promise<PreviewInfo | null> => {
    try {
      const response = await fetch('/api/duplicates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, filepath })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get preview:', error);
    }
    return null;
  };

  const handleAction = async (action: 'rename' | 'delete', filepath: string, filename: string) => {
    let preview: PreviewInfo | null = null;
    
    if (action === 'rename') {
      preview = await getPreviewInfo(filepath);
    }
    
    setShowConfirm({ action, filepath, filename, preview });
  };

  const confirmAction = async () => {
    if (!showConfirm) return;
    
    setResolving(showConfirm.filepath);
    try {
      const response = await fetch('/api/duplicates/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          oldFilepath: showConfirm.filepath,
          action: showConfirm.action
        })
      });

      if (response.ok) {
        await loadDuplicates(); // Reload to check if more duplicates exist
        onResolved(); // Notify parent to refresh tickets
      } else {
        alert('Failed to resolve duplicate');
      }
    } catch (error) {
      console.error('Failed to resolve duplicate:', error);
      alert('Failed to resolve duplicate');
    } finally {
      setResolving(null);
      setShowConfirm(null);
    }
  };

  if (loading) return <div>Checking for duplicates...</div>;
  if (duplicates.length === 0) return null;

  return (
    <div className="duplicate-resolver" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '16px' }}>
          ⚠️ Error! Duplicate Ticket Keys Found!
        </h2>
        
        <p style={{ marginBottom: '20px' }}>
          Multiple tickets have the same key, which causes UI issues. 
          Please resolve by renaming or deleting duplicates:
        </p>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>💡 How renaming works:</strong><br/>
          The "Rename" button will automatically assign the next available ticket number 
          (e.g., if the highest ticket is MDT-025, the renamed ticket becomes MDT-026).
          This ensures no conflicts with existing tickets.
        </div>

        {duplicates.map(duplicate => (
          <div key={duplicate.code} style={{ 
            marginBottom: '24px', 
            padding: '16px', 
            border: '1px solid #dc3545',
            borderRadius: '4px',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '12px' }}>
              Duplicate Key: {duplicate.code}
            </h3>
            
            {duplicate.tickets.map(ticket => (
              <div key={ticket.filepath} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                marginBottom: '8px',
                backgroundColor: 'white',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{ticket.filename}</div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>{ticket.title}</div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAction('rename', ticket.filepath, ticket.filename)}
                    disabled={resolving === ticket.filepath}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {resolving === ticket.filepath ? 'Renaming...' : 'Rename to Next #'}
                  </button>
                  
                  <button
                    onClick={() => handleAction('delete', ticket.filepath, ticket.filename)}
                    disabled={resolving === ticket.filepath}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px'
          }}>
            <h3>Confirm {showConfirm.action === 'rename' ? 'Rename' : 'Delete'}</h3>
            <p>
              Are you sure you want to {showConfirm.action} this ticket?
            </p>
            <p style={{ fontWeight: 'bold', marginBottom: '16px' }}>{showConfirm.filename}</p>
            
            {showConfirm.action === 'rename' && showConfirm.preview && (
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '16px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                  <strong>Preview of changes:</strong>
                </div>
                <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                  <div style={{ color: '#28a745' }}>
                    ✓ New ticket key: <strong>{showConfirm.preview.newCode}</strong>
                  </div>
                  <div style={{ color: '#28a745' }}>
                    ✓ New filename: <strong>{showConfirm.preview.newFilename}</strong>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={confirmAction}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showConfirm.action === 'rename' ? '#007bff' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Yes, {showConfirm.action}
              </button>
              
              <button
                onClick={() => setShowConfirm(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
