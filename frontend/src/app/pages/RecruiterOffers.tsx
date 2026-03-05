import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecruiterHeader } from "../components/RecruiterHeader";
import { FileText, CheckCircle, XCircle, Clock, Eye, MessageSquare } from "lucide-react";
import { apiClient } from "../../utils/apiClient";
import { toast } from "sonner";

interface Offer {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  position: string;
  salary: string;
  startDate: string;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  sentDate: string;
  responseDate?: string;
  counterOffer?: {
    salary?: string;
    startDate?: string;
    message?: string;
  };
}

export function RecruiterOffers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const data = await apiClient.get('/offers/recruiter');

      if (data.success && Array.isArray(data.offers)) {
        setOffers(data.offers);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const filteredOffers = selectedStatus === 'all'
    ? offers
    : offers.filter(o => o.status === selectedStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
      case 'accepted': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'negotiating': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'accepted': return CheckCircle;
      case 'rejected': return XCircle;
      case 'negotiating': return MessageSquare;
      default: return FileText;
    }
  };

  const stats = [
    { label: 'Total Sent', value: offers.length, color: 'text-blue-600' },
    { label: 'Pending', value: offers.filter(o => o.status === 'pending').length, color: 'text-yellow-600' },
    { label: 'Accepted', value: offers.filter(o => o.status === 'accepted').length, color: 'text-green-600' },
    { label: 'Negotiating', value: offers.filter(o => o.status === 'negotiating').length, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RecruiterHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Offer Letters
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage all sent offer letters
          </p>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
            >
              <p className={`text-3xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 border border-gray-200 dark:border-gray-700 mb-6 flex flex-wrap gap-2">
          {['all', 'pending', 'negotiating', 'accepted', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${selectedStatus === status
                ? 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredOffers.length > 0 ? (
          <div className="space-y-4">
            {filteredOffers.map((offer) => {
              const StatusIcon = getStatusIcon(offer.status);
              return (
                <div
                  key={offer.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {offer.candidateName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(offer.status)}`}>
                          <StatusIcon className="w-3 h-3" />
                          {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {offer.position}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {offer.candidateEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {offer.salary}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Starts: {new Date(offer.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div>
                      <span className="font-medium">Sent: </span>
                      {new Date(offer.sentDate).toLocaleDateString()}
                    </div>
                    {offer.responseDate && (
                      <div>
                        <span className="font-medium">Responded: </span>
                        {new Date(offer.responseDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Counter Offer */}
                  {offer.status === 'negotiating' && offer.counterOffer && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Counter Offer
                      </h4>
                      <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                        {offer.counterOffer.salary && (
                          <p><span className="font-medium">Requested Salary:</span> {offer.counterOffer.salary}</p>
                        )}
                        {offer.counterOffer.startDate && (
                          <p><span className="font-medium">Requested Start Date:</span> {offer.counterOffer.startDate}</p>
                        )}
                        {offer.counterOffer.message && (
                          <p className="mt-2"><span className="font-medium">Message:</span> {offer.counterOffer.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {offer.status === 'negotiating' && (
                      <button
                        onClick={() => navigate(`/recruiter/messages?candidateId=${offer.candidateId}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Negotiate
                      </button>
                    )}
                    {offer.status === 'accepted' && (
                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Send Employee Details
                      </button>
                    )}
                    <button
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {selectedStatus === 'all' ? 'No offers sent yet' : `No ${selectedStatus} offers`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedStatus === 'all'
                ? 'Send offer letters to candidates from the in-process page'
                : `There are no offers with ${selectedStatus} status`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
